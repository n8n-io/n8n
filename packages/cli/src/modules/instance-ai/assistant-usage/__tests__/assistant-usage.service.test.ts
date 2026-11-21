import type { Logger } from '@n8n/backend-common';
import type { InstanceAiConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { AssistantUsageRepository } from '../database/assistant-usage.repository';
import { AssistantUsageService } from '../assistant-usage.service';

const scope = { userId: 'user-1', threadId: 'thread-1', projectId: 'project-1' };

function setup(config: Partial<InstanceAiConfig> = {}) {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const repository = mock<AssistantUsageRepository>();
	const service = new AssistantUsageService(
		logger,
		repository,
		mock<InstanceAiConfig>({ usageMaxAgeDays: 365, ...config }),
	);
	return { logger, repository, service };
}

describe('AssistantUsageService', () => {
	describe('recordArtifact', () => {
		it('skips an artifact that the tool did not create', async () => {
			const { repository, service } = setup();

			await service.recordArtifact({ ...scope, artifact: { type: 'workflow', id: 'wf-1' } });

			expect(repository.addCreatedResource).not.toHaveBeenCalled();
		});

		it('skips a created artifact of a type that the usage does not count', async () => {
			const { repository, service } = setup();

			await service.recordArtifact({
				...scope,
				artifact: { type: 'skill', id: 'skill-1', created: true },
			});

			expect(repository.addCreatedResource).not.toHaveBeenCalled();
		});

		it('records a created resource in the project of the resource', async () => {
			const { repository, service } = setup();

			await service.recordArtifact({
				...scope,
				artifact: { type: 'data-table', id: 'dt-1', projectId: 'project-2', created: true },
			});

			expect(repository.addCreatedResource).toHaveBeenCalledWith(
				{
					userId: 'user-1',
					threadId: 'thread-1',
					projectId: 'project-2',
					type: 'data-table-created',
					resourceId: 'dt-1',
				},
				{},
			);
		});

		it('uses the project of the thread when the resource has none', async () => {
			const { repository, service } = setup();

			await service.recordArtifact({
				...scope,
				artifact: { type: 'agent', id: 'agent-1', created: true },
			});

			expect(repository.addCreatedResource).toHaveBeenCalledWith(
				expect.objectContaining({ projectId: 'project-1', type: 'agent-created' }),
				{},
			);
		});

		it('logs and continues when the record fails', async () => {
			const { repository, service, logger } = setup();
			repository.addCreatedResource.mockRejectedValue(new Error('db down'));

			await expect(
				service.recordArtifact({
					...scope,
					artifact: { type: 'workflow', id: 'wf-1', created: true },
				}),
			).resolves.toBeUndefined();
			expect(logger.warn).toHaveBeenCalled();
		});
	});

	describe('recordMessage', () => {
		it('logs and continues when the record fails', async () => {
			const { repository, service, logger } = setup();
			repository.addMessage.mockRejectedValue(new Error('db down'));

			await expect(service.recordMessage(scope)).resolves.toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith('Failed to record Assistant usage of a message', {
				threadId: 'thread-1',
				error: 'db down',
			});
		});
	});

	describe('getUsage', () => {
		it('returns every day of the range in the time zone, with zeros for days without usage', async () => {
			const { repository, service } = setup();
			repository.summarize.mockResolvedValue({
				conversations: 1,
				messages: 2,
				activeUsers: 1,
				workflowsCreated: 1,
				agentsCreated: 0,
				dataTablesCreated: 0,
			});
			repository.countByDay.mockResolvedValue([
				{
					date: '2026-11-11',
					conversations: 1,
					messages: 2,
					workflowsCreated: 1,
					agentsCreated: 0,
					dataTablesCreated: 0,
				},
			]);

			const usage = await service.getUsage({
				// 23:00 UTC on the 9th is the 10th in Berlin.
				startDate: new Date('2026-11-09T23:00:00.000Z'),
				endDate: new Date('2026-11-12T10:00:00.000Z'),
				timeZone: 'Europe/Berlin',
			});

			expect(usage.byDay.map((day) => [day.date, day.messages])).toEqual([
				['2026-11-10', 0],
				['2026-11-11', 2],
				['2026-11-12', 0],
			]);
			expect(repository.countByDay).toHaveBeenCalledWith(
				expect.objectContaining({ projectId: undefined }),
				'Europe/Berlin',
				{},
			);
		});
	});

	describe('getUsers', () => {
		it('sorts by messages when no sort is given', async () => {
			const { repository, service } = setup();
			repository.countByUser.mockResolvedValue({ count: 0, data: [] });
			const query = { startDate: new Date(), endDate: new Date(), skip: 20, take: 10 };

			await service.getUsers(query);

			expect(repository.countByUser).toHaveBeenCalledWith(
				expect.anything(),
				{ skip: 20, take: 10, sortBy: 'messages:desc' },
				{},
			);
		});
	});

	describe('pruneOldEvents', () => {
		it('deletes the events past the retention period', async () => {
			const { repository, service } = setup({ usageMaxAgeDays: 30 });
			repository.deleteCreatedBefore.mockResolvedValue(3);
			const now = new Date('2026-11-30T00:00:00.000Z').getTime();

			await service.pruneOldEvents(now);

			expect(repository.deleteCreatedBefore).toHaveBeenCalledWith(
				new Date('2026-10-31T00:00:00.000Z'),
				{},
			);
		});

		it('keeps every event when the retention period is 0', async () => {
			const { repository, service } = setup({ usageMaxAgeDays: 0 });

			await service.pruneOldEvents();

			expect(repository.deleteCreatedBefore).not.toHaveBeenCalled();
		});
	});
});
