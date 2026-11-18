import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import postgresVersions from 'n8n-containers/postgres-versions.json';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AllowAllAdmittance } from '../../admittance';
import { SharedSecretIdentityVerifier } from '../../auth';
import { createDataSource, createStores } from '../../database';
import { generateId } from '../../database/generate-id';
import { noopExecutionResponseSender } from '../../response-channel';
import { createEngineRuntime } from '../../runtime';

const staleness = { queuedMs: 50, runningStepMs: 60_000 };

describe('queued execution with no event (integration)', () => {
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

	it('runs an execution whose event was never published', async () => {
		const { executionStore } = createStores(dataSource, staleness);
		const executionId = generateId();
		// The row exists and no `execution:enqueued` event does, as after a crash
		// between the insert and the publish.
		await executionStore.createExecution({
			id: executionId,
			workflowId: 'wf-1',
			status: 'queued',
			mode: 'production',
			graph: {
				nodes: [{ id: 'trigger', name: 'Webhook', type: 'trigger' }],
				edges: [],
				seeded: [],
			},
			workflow: {},
			triggerOutputs: null,
			callerContext: { hostMode: 'trigger' },
			responseExpectation: { kind: 'none' },
			parent: null,
		});
		const runtime = createEngineRuntime({
			dataSource,
			admittance: new AllowAllAdmittance(),
			identityVerifier: new SharedSecretIdentityVerifier('a'.repeat(32)),
			responseSender: noopExecutionResponseSender,
			staleness,
			reconciliationIntervalMs: 20,
		});

		runtime.start();
		try {
			await vi.waitFor(
				async () => expect(await executionStore.loadExecutionStatus(executionId)).toBe('completed'),
				{ timeout: 5_000, interval: 20 },
			);
		} finally {
			await runtime.stop();
		}
	});
});
