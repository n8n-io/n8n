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

	describe('recordTokens', () => {
		const tokens = (model: string, uncachedInput: number, output: number, cacheRead = 0) => ({
			type: 'llmTokens' as const,
			model,
			uncachedInput,
			cacheRead,
			cacheWrite: 0,
			output,
		});

		it('records one row for each model, with cache reads and writes in the input', async () => {
			const { repository, service } = setup();

			await service.recordTokens(scope, [
				tokens('anthropic/claude-sonnet-5-5', 100, 20, 1000),
				{ ...tokens('anthropic/claude-sonnet-5-5', 50, 10), cacheWrite: 300 },
				tokens('anthropic/claude-haiku-5-5', 7, 3),
			]);

			expect(repository.addTokenUsage).toHaveBeenCalledWith(
				[
					{
						...scope,
						model: 'anthropic/claude-sonnet-5-5',
						inputTokens: 1450,
						outputTokens: 30,
						cacheReadTokens: 1000,
						cacheWriteTokens: 300,
					},
					{
						...scope,
						model: 'anthropic/claude-haiku-5-5',
						inputTokens: 7,
						outputTokens: 3,
						cacheReadTokens: 0,
						cacheWriteTokens: 0,
					},
				],
				{},
			);
		});

		it('drops a model without tokens', async () => {
			const { repository, service } = setup();

			await service.recordTokens(scope, [tokens('anthropic/claude-haiku-5-5', 0, 0)]);

			expect(repository.addTokenUsage).toHaveBeenCalledWith([], {});
		});

		it('logs and continues when the record fails', async () => {
			const { repository, service, logger } = setup();
			repository.addTokenUsage.mockRejectedValue(new Error('db down'));

			await expect(
				service.recordTokens(scope, [tokens('anthropic/claude-haiku-5-5', 1, 1)]),
			).resolves.toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith('Failed to record Assistant usage of tokens', {
				threadId: 'thread-1',
				error: 'db down',
			});
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
