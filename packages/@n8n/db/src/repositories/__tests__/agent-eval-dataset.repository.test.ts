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
		const existing = () =>
			({
				id: 'ds-1',
				agentId: 'agent-1',
				name: 'old',
				description: 'old desc',
				columnMapping: { input: 'q' },
			}) as AgentEvalDataset;

		it('applies only the provided fields', async () => {
			entityManager.findOneBy.mockResolvedValueOnce(existing());
			entityManager.save.mockImplementationOnce(async (_target, entity) => entity);

			await repo.updateDataset('ds-1', 'agent-1', { name: 'new' });

			expect(entityManager.save.mock.calls[0]?.[1]).toMatchObject({
				name: 'new',
				// untouched by an absent key
				description: 'old desc',
				columnMapping: { input: 'q' },
			});
		});

		it('clears a field when explicitly passed null', async () => {
			entityManager.findOneBy.mockResolvedValueOnce(existing());
			entityManager.save.mockImplementationOnce(async (_target, entity) => entity);

			await repo.updateDataset('ds-1', 'agent-1', { description: null, columnMapping: null });

			expect(entityManager.save.mock.calls[0]?.[1]).toMatchObject({
				description: null,
				columnMapping: null,
			});
		});

		it('returns null without writing when the dataset is not this agent’s', async () => {
			entityManager.findOneBy.mockResolvedValueOnce(null);

			await expect(repo.updateDataset('ds-1', 'other-agent', { name: 'new' })).resolves.toBeNull();

			expect(entityManager.save).not.toHaveBeenCalled();
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
