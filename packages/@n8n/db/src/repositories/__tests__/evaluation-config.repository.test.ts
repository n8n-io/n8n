import type { UpsertEvaluationConfigDto } from '@n8n/api-types';
import { Container } from '@n8n/di';

import { EvaluationConfig } from '../../entities/evaluation-config.ee';
import { mockEntityManager } from '../../utils/test-utils/mock-entity-manager';
import { EvaluationConfigRepository } from '../evaluation-config.repository';

describe('EvaluationConfigRepository', () => {
	const entityManager = mockEntityManager(EvaluationConfig);
	const repo = Container.get(EvaluationConfigRepository);

	const buildPayload = (
		overrides: Partial<UpsertEvaluationConfigDto> = {},
	): UpsertEvaluationConfigDto =>
		({
			name: 'My eval',
			datasetSource: 'data_table',
			datasetRef: { dataTableId: 'dt-1' },
			startNodeName: 'When clicking Execute',
			endNodeName: 'Set',
			metrics: [
				{
					id: 'metric-1',
					name: 'Exact match',
					type: 'expression',
					config: {
						expression: '={{ $json.a === $json.b }}',
						outputType: 'boolean',
					},
				},
			],
			...overrides,
		}) as UpsertEvaluationConfigDto;

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('listByWorkflowId', () => {
		it('returns all configs ordered by createdAt', async () => {
			const rows = [
				{ id: 'c1', workflowId: 'wf-1' },
				{ id: 'c2', workflowId: 'wf-1' },
			] as EvaluationConfig[];
			entityManager.find.mockResolvedValueOnce(rows);

			const result = await repo.listByWorkflowId('wf-1');

			expect(result).toBe(rows);
			const callArgs = entityManager.find.mock.calls[0];
			expect(callArgs?.[1]).toEqual({
				where: { workflowId: 'wf-1' },
				order: { createdAt: 'ASC' },
			});
		});

		it('returns an empty array when none exist', async () => {
			entityManager.find.mockResolvedValueOnce([]);
			expect(await repo.listByWorkflowId('wf-1')).toEqual([]);
		});
	});

	describe('findByIdAndWorkflowId', () => {
		it('returns null when no row matches', async () => {
			entityManager.findOne.mockResolvedValueOnce(null);
			expect(await repo.findByIdAndWorkflowId('cfg-1', 'wf-1')).toBeNull();
			const callArgs = entityManager.findOne.mock.calls[0];
			expect(callArgs?.[1]).toEqual({ where: { id: 'cfg-1', workflowId: 'wf-1' } });
		});

		it('returns the config when one exists', async () => {
			const row = { id: 'cfg-1', workflowId: 'wf-1' } as EvaluationConfig;
			entityManager.findOne.mockResolvedValueOnce(row);
			expect(await repo.findByIdAndWorkflowId('cfg-1', 'wf-1')).toBe(row);
		});
	});

	describe('createForWorkflow', () => {
		it('persists a new config with the supplied id and workflow id', async () => {
			const payload = buildPayload();
			(entityManager.create as jest.Mock).mockImplementation(
				(_target: unknown, entityLike: unknown) => entityLike as EvaluationConfig,
			);
			entityManager.save.mockImplementationOnce(async (_target, entity) => entity);

			const result = await repo.createForWorkflow('cfg-1', 'wf-1', payload);

			expect(entityManager.save).toHaveBeenCalledTimes(1);
			const savedEntity = entityManager.save.mock.calls[0]?.[1];
			expect(savedEntity).toMatchObject({
				id: 'cfg-1',
				workflowId: 'wf-1',
				status: 'valid',
				invalidReason: null,
				name: payload.name,
				datasetSource: payload.datasetSource,
				datasetRef: payload.datasetRef,
				startNodeName: payload.startNodeName,
				endNodeName: payload.endNodeName,
				metrics: payload.metrics,
			});
			expect(result).toMatchObject({ id: 'cfg-1', workflowId: 'wf-1', status: 'valid' });
		});
	});

	describe('updateForWorkflow', () => {
		it('rewrites fields on the existing entity and resets status to valid', async () => {
			const existing = {
				id: 'cfg-1',
				workflowId: 'wf-1',
				...buildPayload(),
				status: 'invalid',
				invalidReason: 'END_NODE_DELETED',
				name: 'Old',
			} as EvaluationConfig;
			const updated = buildPayload({ name: 'New', endNodeName: 'New End' });

			entityManager.findOne.mockResolvedValueOnce(existing);
			entityManager.save.mockImplementationOnce(async (_target, entity) => entity);

			const result = await repo.updateForWorkflow('cfg-1', 'wf-1', updated);

			expect(result).toBe(existing);
			expect(existing).toMatchObject({
				name: 'New',
				endNodeName: 'New End',
				status: 'valid',
				invalidReason: null,
			});
		});

		it('returns null when no config matches', async () => {
			entityManager.findOne.mockResolvedValueOnce(null);
			expect(await repo.updateForWorkflow('cfg-1', 'wf-1', buildPayload())).toBeNull();
			expect(entityManager.save).not.toHaveBeenCalled();
		});
	});

	describe('deleteByIdAndWorkflowId', () => {
		it('issues a scoped delete and returns the affected count', async () => {
			entityManager.delete.mockResolvedValueOnce({ affected: 1, raw: {} });
			expect(await repo.deleteByIdAndWorkflowId('cfg-1', 'wf-1')).toBe(1);
			const callArgs = entityManager.delete.mock.calls[0];
			expect(callArgs?.[1]).toEqual({ id: 'cfg-1', workflowId: 'wf-1' });
		});

		it('returns 0 when no config matches', async () => {
			entityManager.delete.mockResolvedValueOnce({ affected: 0, raw: {} });
			expect(await repo.deleteByIdAndWorkflowId('cfg-1', 'wf-1')).toBe(0);
		});
	});

	describe('markInvalid', () => {
		it('updates status and invalidReason for the given config', async () => {
			entityManager.update.mockResolvedValueOnce({
				affected: 1,
				raw: {},
				generatedMaps: [],
			});

			await repo.markInvalid('cfg-1', 'END_NODE_DELETED');

			const callArgs = entityManager.update.mock.calls[0];
			expect(callArgs?.[1]).toEqual({ id: 'cfg-1' });
			expect(callArgs?.[2]).toEqual({ status: 'invalid', invalidReason: 'END_NODE_DELETED' });
		});
	});

	describe('countDistinctWorkflowsWithConfigs', () => {
		it('returns the count of distinct workflowIds that have at least one config', async () => {
			const qbMock = {
				select: jest.fn().mockReturnThis(),
				distinct: jest.fn().mockReturnThis(),
				getCount: jest.fn().mockResolvedValueOnce(7),
			};
			jest
				.spyOn(repo, 'createQueryBuilder')
				.mockReturnValueOnce(qbMock as unknown as ReturnType<typeof repo.createQueryBuilder>);

			expect(await repo.countDistinctWorkflowsWithConfigs()).toBe(7);
			expect(qbMock.select).toHaveBeenCalledWith('evaluation_config.workflowId');
			expect(qbMock.distinct).toHaveBeenCalledWith(true);
			expect(qbMock.getCount).toHaveBeenCalledTimes(1);
		});
	});
});
