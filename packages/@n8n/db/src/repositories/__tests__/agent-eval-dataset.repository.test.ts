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

	describe('findById', () => {
		it('looks up a single dataset by id', async () => {
			entityManager.findOneBy.mockResolvedValueOnce(null);

			await repo.findById('ds-1');

			expect(entityManager.findOneBy.mock.calls[0]?.[1]).toEqual({ id: 'ds-1' });
		});
	});

	describe('findByIdAndAgentId', () => {
		it('filters on the agent as well as the id', async () => {
			entityManager.findOneBy.mockResolvedValueOnce(null);

			await repo.findByIdAndAgentId('ds-1', 'agent-1');

			expect(entityManager.findOneBy.mock.calls[0]?.[1]).toEqual({
				id: 'ds-1',
				agentId: 'agent-1',
			});
		});
	});

	describe('updateDataset', () => {
		const updated = { affected: 1, generatedMaps: [], raw: [] };

		it('writes only the provided fields, scoped to the agent', async () => {
			entityManager.update.mockResolvedValueOnce(updated);
			entityManager.findOneBy.mockResolvedValueOnce({ id: 'ds-1' } as AgentEvalDataset);

			await repo.updateDataset('ds-1', 'agent-1', { name: 'new' });

			const [, criteria, patch] = entityManager.update.mock.calls[0] ?? [];
			expect(criteria).toEqual({ id: 'ds-1', agentId: 'agent-1' });
			// Absent keys stay out of the patch entirely, so their columns are untouched
			// and a concurrent patch of a different field can't be clobbered.
			expect(patch).toEqual({ name: 'new' });
		});

		it('clears a field when explicitly passed null', async () => {
			entityManager.update.mockResolvedValueOnce(updated);
			entityManager.findOneBy.mockResolvedValueOnce({ id: 'ds-1' } as AgentEvalDataset);

			await repo.updateDataset('ds-1', 'agent-1', { description: null, columnMapping: null });

			expect(entityManager.update.mock.calls[0]?.[2]).toEqual({
				description: null,
				columnMapping: null,
			});
		});

		it('skips the write when no known field was given', async () => {
			entityManager.findOneBy.mockResolvedValueOnce({ id: 'ds-1' } as AgentEvalDataset);

			await repo.updateDataset('ds-1', 'agent-1', {});

			expect(entityManager.update).not.toHaveBeenCalled();
		});

		it('returns null when the dataset is not this agent’s', async () => {
			entityManager.update.mockResolvedValueOnce({ affected: 0, generatedMaps: [], raw: [] });
			entityManager.findOneBy.mockResolvedValueOnce(null);

			await expect(repo.updateDataset('ds-1', 'other-agent', { name: 'new' })).resolves.toBeNull();
		});
	});

	describe('deleteDataset', () => {
		it('scopes the delete to the agent and reports a removal', async () => {
			entityManager.delete.mockResolvedValueOnce({ affected: 1, raw: [] });

			await expect(repo.deleteDataset('ds-1', 'agent-1')).resolves.toBe(true);

			expect(entityManager.delete.mock.calls[0]?.[1]).toEqual({
				id: 'ds-1',
				agentId: 'agent-1',
			});
		});

		it('reports no removal when nothing matched', async () => {
			entityManager.delete.mockResolvedValueOnce({ affected: 0, raw: [] });

			await expect(repo.deleteDataset('ds-1', 'other-agent')).resolves.toBe(false);
		});
	});
});
