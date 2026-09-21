import { Logger } from '@n8n/backend-common';
import { EngineConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { EngineRuntime, ExecutionResponseSender } from '@n8n/engine';
import {
	AllowAllAdmittance,
	createDataSource,
	createEngineRuntime,
	SharedSecretIdentityVerifier,
} from '@n8n/engine';
import type { AdditionalDataContext } from '@n8n/node-engine-compatibility';
import { createEngineStepDataLoader, V1StepExecutor } from '@n8n/node-engine-compatibility';
import type { IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';
import assert from 'node:assert';
import type { Server } from 'node:http';

import { CredentialTypes } from '@/credential-types';
import { CredentialsHelper } from '@/credentials-helper';
import { NodeTypes } from '@/node-types';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

import { EngineControlPlaneClient } from './engine-control-plane-client';
import { EngineCredentialsClient } from './engine-credentials-client';
import { RemoteCredentialsHelper } from './remote-credentials-helper';

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

	/**
	 * Shared by every credential request. Aborted after the engine has stopped,
	 * so no request outlives it.
	 * TODO(CAT-4526): replace with a per-step signal once the engine produces one.
	 */
	private stopping?: AbortController;

	constructor(
		private readonly engineConfig: EngineConfig,
		private readonly nodeTypes: NodeTypes,
		private readonly logger: Logger,
		private readonly controlPlaneClient: EngineControlPlaneClient,
		private readonly credentialsClient: EngineCredentialsClient,
		private readonly credentialsHelper: CredentialsHelper,
		private readonly credentialTypes: CredentialTypes,
	) {
		this.logger = this.logger.scoped('engine-v2');
	}

	async init(responseSender: ExecutionResponseSender): Promise<void> {
		try {
			await this.initDb();

			this.initEngine(responseSender);

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

	private initEngine(responseSender: ExecutionResponseSender): void {
		assert(this.dataSource, 'Engine 2.0 cannot start without a data source');

		const stopping = new AbortController();
		this.stopping = stopping;

		const engine = createEngineRuntime({
			dataSource: this.dataSource,
			// TODO(CAT-2909): placeholder policy — every execution is admitted and no
			// limits are applied.
			admittance: new AllowAllAdmittance(),
			identityVerifier: new SharedSecretIdentityVerifier(this.engineConfig.authSecret),
			logger: this.logger,
			responseSender,
			externalDependencies: ({ executionStore, stepStore }) => ({
				lifecycleEventCallback: async (events, signal) =>
					await this.controlPlaneClient.sendLifecycleEvents(events, signal),
				v1StepExecutor: new V1StepExecutor({
					nodeTypes: this.nodeTypes,
					additionalDataFactory: async (context) =>
						await this.buildAdditionalData(context, stopping),
					loadStepData: createEngineStepDataLoader(executionStore, stepStore),
				}),
			}),
		});
		engine.start();

		this.engine = engine;
	}

	/**
	 * The v1 `additionalData` for one step. `getBase` builds it as it does for a
	 * v1 execution, so `$vars`, `$secrets` and the policy context match the
	 * workflow. The credentials helper is then swapped for one that asks the
	 * control plane over HTTP, because the data plane has no credential store.
	 */
	private async buildAdditionalData(
		context: AdditionalDataContext,
		stopping: AbortController,
	): Promise<IWorkflowExecuteAdditionalData> {
		const additionalData = await WorkflowExecuteAdditionalData.getBase({
			userId: context.userId,
			workflowId: context.workflowId,
			projectId: context.projectId,
		});

		// The task runner keys its tasks by execution id, so it needs the engine's
		// id to cancel them. `$execution.id` also reads it.
		additionalData.executionId = context.executionId;

		// `putExecutionToWait` calls this hook. The one `getBase` installs looks the
		// execution up in `ActiveExecutions`, which never registers a data-plane
		// run, so it would throw and fail the step before the shim reads the
		// deadline. The engine records the wait from the step's declaration instead.
		additionalData.setExecutionStatus = (status) => {
			this.logger.debug(`Step reports execution status "${status}"`, {
				executionId: context.executionId,
				workflowId: context.workflowId,
			});
		};

		additionalData.credentialsHelper = new RemoteCredentialsHelper(
			this.credentialsClient,
			this.credentialsHelper,
			this.credentialTypes,
			context,
			stopping.signal,
		);

		return additionalData;
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
		this.stopping?.abort();
		this.stopping = undefined;
	}

	private async destroyDataSource(): Promise<void> {
		if (!this.dataSource) return;

		if (this.dataSource.isInitialized) await this.dataSource.destroy();
		this.dataSource = undefined;
	}
}
