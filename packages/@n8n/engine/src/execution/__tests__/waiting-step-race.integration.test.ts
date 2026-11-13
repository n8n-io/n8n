import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import postgresVersions from 'n8n-containers/postgres-versions.json';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AllowAllAdmittance } from '../../admittance';
import { mintIdentityToken, SharedSecretIdentityVerifier } from '../../auth';
import { createDataSource, WorkflowExecution, WorkflowStepExecution } from '../../database';
import { generateId } from '../../database/generate-id';
import type { IStepExecutor } from '../../dependencies';
import { noopExecutionResponseSender } from '../../response-channel';
import { createEngineRuntime } from '../../runtime';
import type { StartExecutionResult } from '../start-execution.service';

const secret = 'a'.repeat(32);

const authHeader = () => ({
	authorization: `Bearer ${mintIdentityToken(secret, { cpId: 'cp-1', tenantId: 'tenant-1' })}`,
});

function deferred() {
	let resolve!: () => void;
	const promise = new Promise<void>((r) => (resolve = r));
	return { promise, resolve };
}

describe('a step that starts to wait after its execution ended (integration)', () => {
	let container: StartedPostgreSqlContainer;
	let dataSource: DataSource;

	beforeAll(async () => {
		container = await new PostgreSqlContainer(postgresVersions.primary).start();
		dataSource = createDataSource(container.getConnectionUri());
		await dataSource.initialize();
		await dataSource.runMigrations();
	}, 120_000);

	afterAll(async () => {
		if (dataSource?.isInitialized) await dataSource.destroy();
		if (container) await container.stop();
	});

	it('cancels a step that starts to wait after the execution was cancelled', async () => {
		// The cancel request does not go through the step queue, so it ends the
		// execution while the step still runs.
		const started = deferred();
		const cancelled = deferred();
		const suspended = deferred();
		const executor: IStepExecutor = {
			execute: async () => {
				started.resolve();
				await cancelled.promise;
				// A request-only wait: nothing but a resume request can end it.
				return { wait: { resumeBinding: 'step' } };
			},
		};

		const runtime = createEngineRuntime({
			dataSource,
			admittance: new AllowAllAdmittance(),
			identityVerifier: new SharedSecretIdentityVerifier(secret),
			responseSender: noopExecutionResponseSender,
			externalDependencies: ({ stepStore }) => {
				const suspendStep = stepStore.suspendStep.bind(stepStore);
				vi.spyOn(stepStore, 'suspendStep').mockImplementation(async (id, declaration) => {
					const result = await suspendStep(id, declaration);
					suspended.resolve();
					return result;
				});
				return { v1StepExecutor: executor };
			},
		});
		runtime.start();

		const response = await request(runtime.app)
			.post('/api/workflow-executions')
			.set(authHeader())
			.send({
				workflowId: 'wf-wait-after-end',
				graph: {
					nodes: [
						{ id: 'trigger', name: 'Webhook', type: 'trigger' },
						{ id: 'node-a', name: 'A', type: 'v1-node' },
					],
					edges: [{ from: 'trigger', to: 'node-a', outputIndex: 0, inputIndex: 0 }],
				},
				workflow: {},
				triggerOutputs: [{}],
				executionId: generateId(),
				callerContext: { hostMode: 'trigger' },
			})
			.expect(201);
		const { executionId } = response.body as StartExecutionResult;

		await started.promise;
		await request(runtime.app)
			.post(`/api/workflow-executions/${executionId}/cancel`)
			.set(authHeader())
			.expect(200);
		cancelled.resolve();
		await suspended.promise;
		await runtime.stop();

		const execution = await dataSource
			.getRepository(WorkflowExecution)
			.findOneOrFail({ where: { id: executionId } });
		const step = await dataSource
			.getRepository(WorkflowStepExecution)
			.findOneOrFail({ where: { executionId, nodeId: 'node-a' } });
		expect(execution.status).toBe('cancelled');
		expect(step.status).toBe('cancelled');
	});
});
