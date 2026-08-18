import { Logger } from '@n8n/backend-common';
import { EngineConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { EngineRuntime } from '@n8n/engine';
import { AllowAllAdmittance, createDataSource, createEngineRuntime } from '@n8n/engine';
import { createEngineStepDataLoader, V1StepExecutor } from '@n8n/node-engine-compatibility';
import type { DataSource } from '@n8n/typeorm';
import { UserError } from 'n8n-workflow';
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
	/** Everything `init()` owns, held together so `shutdown()` releases it as one unit. */
	private running?: { dataSource: DataSource; engine: EngineRuntime; server: Server };

	constructor(
		private readonly engineConfig: EngineConfig,
		private readonly nodeTypes: NodeTypes,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('engine-v2');
	}

	async init(): Promise<void> {
		const { databaseUrl, host, port } = this.engineConfig;

		if (!databaseUrl) {
			throw new UserError(
				'The engine-v2 module needs a data plane database. Set N8N_ENGINE_DATABASE_URL.',
			);
		}

		const dataSource = createDataSource(databaseUrl);
		await dataSource.initialize();
		await dataSource.runMigrations();

		const engine = createEngineRuntime({
			dataSource,
			// TODO(CAT-2909): placeholder policy — every execution is admitted and no
			// limits are applied.
			admittance: new AllowAllAdmittance(),
			externalDependencies: ({ executionStore, stepStore }) => ({
				v1StepExecutor: new V1StepExecutor({
					nodeTypes: this.nodeTypes,
					// TODO(CAT-2880): no credential access. A v1 node that needs credentials
					// fails when it asks for them.
					additionalDataFactory: async () => await WorkflowExecuteAdditionalData.getBase(),
					loadStepData: createEngineStepDataLoader(executionStore, stepStore),
				}),
			}),
		});
		engine.start();

		const server = await new Promise<Server>((resolve, reject) => {
			const listener = engine.app.listen(port, host);
			listener.once('listening', () => resolve(listener));
			listener.once('error', reject);
		});

		this.running = { dataSource, engine, server };

		this.logger.info(`Engine 2.0 listening on http://${host}:${port}`);
	}

	async shutdown(): Promise<void> {
		if (!this.running) return;

		const { dataSource, engine, server } = this.running;
		this.running = undefined;

		await new Promise<void>((resolve, reject) => {
			server.close((error) => (error ? reject(error) : resolve()));
		});

		await engine.stop();

		if (dataSource.isInitialized) await dataSource.destroy();
	}
}
