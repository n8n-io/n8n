import { Container } from '@n8n/di';
import type { Mock } from 'vitest';

import { AgentEvalDataset } from '../../entities/agent-eval-dataset.ee';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { AgentEvalDatasetRepository } from '../agent-eval-dataset.repository.ee';

describe('AgentEvalDatasetRepository', () => {
	const entityManager = mockEntityManager(AgentEvalDataset);
	const repo = Container.get(AgentEvalDatasetRepository);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('createDataset', () => {
		it('defaults optional fields to null', async () => {
			(entityManager.create as Mock).mockImplementation(
				(_target: unknown, entityLike: unknown) => entityLike as AgentEvalDataset,
			);
			entityManager.save.mockImplementationOnce(async (_target, entity) => entity);

			await repo.createDataset({
				name: 'D',
				agentId: 'agent-1',
				datasetSource: 'data_table',
				datasetRef: { dataTableId: 'dt-1' },
			});

			const saved = entityManager.save.mock.calls[0]?.[1];
			expect(saved).toMatchObject({
				name: 'D',
				agentId: 'agent-1',
				datasetSource: 'data_table',
				datasetRef: { dataTableId: 'dt-1' },
				description: null,
				columnMapping: null,
				createdById: null,
			});
		});

		it('persists provided optional fields', async () => {
			(entityManager.create as Mock).mockImplementation(
				(_target: unknown, entityLike: unknown) => entityLike as AgentEvalDataset,
			);
			entityManager.save.mockImplementationOnce(async (_target, entity) => entity);

			await repo.createDataset({
				name: 'D',
				agentId: 'agent-1',
				datasetSource: 'data_table',
				datasetRef: { dataTableId: 'dt-1' },
				description: 'desc',
				columnMapping: { input: 'q', expectedOutput: 'a', criteria: 'c' },
				createdById: 'user-1',
			});

			const saved = entityManager.save.mock.calls[0]?.[1];
			expect(saved).toMatchObject({
				description: 'desc',
				columnMapping: { input: 'q', expectedOutput: 'a', criteria: 'c' },
				createdById: 'user-1',
			});
		});
	});

	describe('findByAgentId', () => {
		it('scopes the lookup to agentId, newest first', async () => {
			entityManager.find.mockResolvedValueOnce([]);

			await repo.findByAgentId('agent-1');

			const callArgs = entityManager.find.mock.calls[0];
			expect(callArgs?.[1]).toEqual({
				where: { agentId: 'agent-1' },
				order: { createdAt: 'DESC' },
			});
		});
	});
});
