import { Logger } from '@n8n/backend-common';
import { EngineConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { EngineRuntime } from '@n8n/engine';
import {
	AllowAllAdmittance,
	createDataSource,
	createEngineRuntime,
	SharedSecretIdentityVerifier,
} from '@n8n/engine';
import { createEngineStepDataLoader, V1StepExecutor } from '@n8n/node-engine-compatibility';
import { UserError } from 'n8n-workflow';
import assert from 'node:assert';
import type { Server } from 'node:http';

import { NodeTypes } from '@/node-types';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

/**
 * Runs the engine 2.0 data plane inside the n8n process.
 *
 * This is the integrated-mode composition root. It chooses the adapters the
 * engine needs — the data plane `DataSource`, the admittance policy, the v1 step
 * executor — and owns the connection and the HTTP listener. The engine owns its
 * own wiring, so this host never sees the workers or the queues.
 */
@Service()
export class EngineV2Runtime {
	private dataSource?: ReturnType<typeof createDataSource>;

	private engine?: EngineRuntime;

	private server?: Server;

	constructor(
		private readonly engineConfig: EngineConfig,
		private readonly nodeTypes: NodeTypes,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('engine-v2');
	}

	async init(): Promise<void> {
		try {
			await this.initDb();

			this.initEngine();

			await this.initServer();
		} catch (error) {
			// A half-started engine holds a connection and its worker loops, and the
			// host has no handle to it, so roll back before surfacing the failure.
			await this.shutdown().catch((teardownError) => {
				this.logger.error('Failed to roll back after Engine 2.0 could not start', {
					teardownError,
				});
			});
			throw error;
		}
	}

	private async initDb(): Promise<void> {
		const { databaseUrl } = this.engineConfig;

		if (!databaseUrl) {
			throw new UserError(
				'The engine-v2 module needs a data plane database. Set N8N_ENGINE_DATABASE_URL.',
			);
		}

		this.dataSource = createDataSource(databaseUrl);
		await this.dataSource.initialize();
		await this.dataSource.runMigrations();
	}

	private initEngine(): void {
		assert(this.dataSource, 'Engine 2.0 cannot start without a data source');

		const engine = createEngineRuntime({
			dataSource: this.dataSource,
			// TODO(CAT-2909): placeholder policy — every execution is admitted and no
			// limits are applied.
			admittance: new AllowAllAdmittance(),
			identityVerifier: new SharedSecretIdentityVerifier(this.engineConfig.authSecret),
			externalDependencies: ({ executionStore, stepStore }) => ({
				v1StepExecutor: new V1StepExecutor({
					nodeTypes: this.nodeTypes,
					// TODO(CAT-2880): no credential access. A v1 node that needs credentials
					// fails when it asks for them.
					additionalDataFactory: async (executionId) => {
						const additionalData = await WorkflowExecuteAdditionalData.getBase();

						// The task runner keys its tasks by execution id, so it needs the engine's
						// id to cancel them. `$execution.id` also reads it.
						additionalData.executionId = executionId;

						return additionalData;
					},
					loadStepData: createEngineStepDataLoader(executionStore, stepStore),
				}),
			}),
		});
		engine.start();

		this.engine = engine;
	}

	private async initServer(): Promise<void> {
		const { host, port } = this.engineConfig;

		this.server = await new Promise<Server>((resolve, reject) => {
			assert(this.engine, 'Engine 2.0 cannot start without an engine runtime');

			const listener = this.engine.app.listen(port, host);
			listener.once('listening', () => resolve(listener));
			listener.once('error', reject);
		});

		// An IPv6 literal needs brackets to read as a URL.
		const shownHost = host.includes(':') ? `[${host}]` : host;
		this.logger.info(`Engine 2.0 listening on http://${shownHost}:${port}`);
	}

	/**
	 * Releases each resource `init()` reached, in reverse order of acquisition.
	 *
	 * Each resource is released on its own, so one failure cannot leave the others
	 * holding a connection or running worker loops.
	 */
	async shutdown(): Promise<void> {
		const errors: unknown[] = [];
		const shutdownTasks = [
			async () => await this.closeServer(),
			async () => await this.stopEngine(),
			async () => await this.destroyDataSource(),
		];

		for (const release of shutdownTasks) {
			await release().catch((error) => {
				errors.push(error);
			});
		}

		if (errors.length > 0) {
			throw new AggregateError(errors, 'Engine 2.0 could not release every resource');
		}
	}

	private async closeServer(): Promise<void> {
		if (!this.server) return;

		await new Promise<void>((resolve, reject) => {
			this.server!.close((error) => (error ? reject(error) : resolve()));
		});

		// Each release drops its handle only after it succeeds, so a resource that
		// failed to release is tried again on the next `shutdown()`.
		this.server = undefined;
	}

	private async stopEngine(): Promise<void> {
		if (!this.engine) return;

		await this.engine.stop();
		this.engine = undefined;
	}

	private async destroyDataSource(): Promise<void> {
		if (!this.dataSource) return;

		if (this.dataSource.isInitialized) await this.dataSource.destroy();
		this.dataSource = undefined;
	}
}
