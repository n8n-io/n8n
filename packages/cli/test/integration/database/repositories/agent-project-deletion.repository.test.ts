import { createRequire } from 'node:module';
import { createTeamProject, testDb } from '@n8n/backend-test-utils';
import { ProjectRepository, SettingsRepository, TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { mockLogger } from '@n8n/backend-test-utils';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import { AgentProjectDeletionRepository } from '@/modules/agents/repositories/agent-project-deletion.repository';

const { TypeOrmTransactionRunner } = createRequire(__filename)(
	'@n8n/db/dist/services/typeorm-transaction',
) as typeof import('@n8n/db/dist/services/typeorm-transaction');

describe('AgentProjectDeletionRepository', () => {
	let repository: AgentProjectDeletionRepository;
	let projectId: string;
	let peer: DataSource;
	let otherMain: AgentProjectDeletionRepository;
	beforeAll(async () => {
		await testDb.init();
		const dataSource = Container.get(DataSource);
		repository = new AgentProjectDeletionRepository(dataSource, Container.get(TransactionRunner));
		peer = await new DataSource({
			...dataSource.options,
			synchronize: false,
			migrationsRun: false,
			dropSchema: false,
		}).initialize();
		otherMain = new AgentProjectDeletionRepository(
			peer,
			new TypeOrmTransactionRunner(peer, mockLogger()),
		);
	});
	beforeEach(async () => {
		projectId = (await createTeamProject()).id;
	});
	afterEach(async () => {
		await Container.get(SettingsRepository).delete({ key: `agents.projectDeletion.${projectId}` });
		await Container.get(ProjectRepository).delete(projectId);
	});
	afterAll(async () => {
		if (peer?.isInitialized) await peer.destroy();
		await testDb.terminate();
	});

	it('blocks later writes on another main and keeps deletion retryable', async () => {
		await repository.beginDeletion(projectId);
		const write = vi.fn(async () => 'saved');
		await expect(otherMain.withWritableProject(projectId, write)).rejects.toThrow('being deleted');
		expect(write).not.toHaveBeenCalled();
		await expect(otherMain.beginDeletion(projectId)).resolves.toBeUndefined();
	});

	it('waits for an admitted write before it marks deletion', async () => {
		const entered = createDeferredPromise<undefined>();
		const release = createDeferredPromise<undefined>();
		const events: string[] = [];
		const write = repository.withWritableProject(projectId, async () => {
			entered.resolve(undefined);
			await release.promise;
			events.push('write finished');
		});
		await entered.promise;
		const deletion = otherMain.beginDeletion(projectId).then(() => {
			events.push('deletion marked');
		});
		try {
			await new Promise((resolve) => setTimeout(resolve, 25));
			expect(events).toEqual([]);
		} finally {
			release.resolve(undefined);
		}
		await Promise.all([write, deletion]);
		expect(events).toEqual(['write finished', 'deletion marked']);
	});

	it('rejects writes after the project cascade', async () => {
		await Container.get(ProjectRepository).delete(projectId);
		const write = vi.fn(async () => undefined);
		await expect(repository.withWritableProject(projectId, write)).rejects.toThrow('being deleted');
		expect(write).not.toHaveBeenCalled();
	});
});
