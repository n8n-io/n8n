import { StartPreferenceMiningDto, type PreferenceMiningRun } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { testDb, testModules } from '@n8n/backend-test-utils';
import { ProjectRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import { createMember } from '@test-integration/db/users';

import { PreferenceMiningRunRepository } from '../database/preference-mining-run.repository';
import { PreferenceMiningDataService } from '../preference-mining-data.service';
import { PreferenceMiningService } from '../preference-mining.service';
import { emptyResult } from '../../workflow-index/preference-mining/preference-lab';
import { WorkflowDependencyQueryService } from '../../workflow-index/workflow-dependency-query.service';

describe('preference mining history', () => {
	let repository: PreferenceMiningRunRepository;
	let user: User;
	let projectId: string;
	const newService = () =>
		new PreferenceMiningService(
			mock<PreferenceMiningDataService>(),
			mock<WorkflowDependencyQueryService>(),
			mock<OutboundHttp>(),
			repository,
			mock<Logger>(),
		);
	const newRun = (): PreferenceMiningRun => ({
		id: randomUUID(),
		projectId,
		status: 'complete',
		stage: 'Finished',
		createdAt: new Date().toISOString(),
		settings: StartPreferenceMiningDto.parse({ approaches: ['baseline'] }),
		results: [emptyResult('baseline')],
	});

	beforeAll(async () => {
		await testModules.loadModules(['preference-mining']);
		await testDb.init();
		repository = Container.get(PreferenceMiningRunRepository);
	});
	beforeEach(async () => {
		user = await createMember();
		projectId = (await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(user.id))
			.id;
	});
	afterAll(async () => await testDb.terminate());

	it('restores the full run after the service is replaced', async () => {
		const run = newRun();
		run.results[0].observations = [
			{ content: 'No supported default.', folderId: null, evidenceIds: ['evidence-1'] },
		];
		run.results[0].metrics = {
			...run.results[0].metrics,
			modelCalls: 2,
			inputTokens: 100,
			estimatedCost: 0.1,
		};
		await repository.saveRun(user.id, run);
		expect(await newService().get(user, projectId, run.id)).toEqual(run);
	});

	it('limits history and run reads to the owner and project', async () => {
		const run = newRun();
		await repository.saveRun(user.id, run);
		const otherUser = await createMember();
		const otherProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			otherUser.id,
		);
		await expect(newService().get(otherUser, projectId, run.id)).rejects.toThrow('not found');
		await expect(newService().get(user, otherProject.id, run.id)).rejects.toThrow('not found');
		expect((await repository.listRuns(otherUser.id, projectId, 0, 20)).items).toEqual([]);
		expect((await repository.listRuns(user.id, otherProject.id, 0, 20)).items).toEqual([]);
	});

	it('updates a checkpoint without adding another history row', async () => {
		const run = { ...newRun(), status: 'running' as const };
		await repository.saveRun(user.id, run);
		const finished = { ...run, status: 'failed' as const, stage: 'A model call failed' };
		await repository.saveRun(user.id, finished);
		const page = await repository.listRuns(user.id, projectId, 0, 20);
		expect(page.total).toBe(1);
		expect(page.items[0].status).toBe('failed');
		expect(await repository.findRun(user.id, projectId, run.id)).toEqual(finished);
	});

	it('retains completed approaches when a running job no longer exists', async () => {
		const run = { ...newRun(), status: 'running' as const };
		await repository.saveRun(user.id, run);
		const recovered = await newService().get(user, projectId, run.id);
		expect(recovered.status).toBe('cancelled');
		expect(recovered.results).toEqual(run.results);
		expect((await repository.findRun(user.id, projectId, run.id))?.status).toBe('cancelled');
	});

	it('pages history without reading run payloads', async () => {
		await repository.saveRun(user.id, newRun());
		await repository.saveRun(user.id, newRun());
		const first = await repository.listRuns(user.id, projectId, 0, 1);
		const second = await repository.listRuns(user.id, projectId, 1, 1);
		expect(first.total).toBe(2);
		expect(first.items).toHaveLength(1);
		expect(second.items).toHaveLength(1);
		expect(first.items[0].id).not.toBe(second.items[0].id);
		expect(first.items[0]).not.toHaveProperty('data');
	});
});
