import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { Settings, SettingsRepository, User, WorkflowRepository } from '@n8n/db';
import { WorkflowEntity } from '@n8n/db';
import type { EntityManager, FindOperator } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import { calculateWorkflowChecksum } from 'n8n-workflow';

import type { CollaborationService } from '@/collaboration/collaboration.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { CacheService } from '@/services/cache/cache.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { UpdateWorkflowsAvailabilityDto } from '../dto/update-workflows-availability.dto';
import { McpSettingsService } from '../mcp.settings.service';

describe('McpSettingsService', () => {
	let service: McpSettingsService;
	let findByKey: jest.Mock<Promise<Settings | null>, [string]>;
	let upsert: jest.Mock;
	let settingsRepository: SettingsRepository;
	const cacheService = mock<CacheService>();
	const workflowRepository = mock<WorkflowRepository>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const logger = mock<Logger>();
	const collaborationService = mock<CollaborationService>();
	const globalConfig = {
		executions: { timeout: -1 },
	} as unknown as GlobalConfig;

	beforeEach(() => {
		jest.clearAllMocks();
		findByKey = jest.fn<Promise<Settings | null>, [string]>();
		upsert = jest.fn();
		settingsRepository = { findByKey, upsert } as unknown as SettingsRepository;
		collaborationService.filterOpenWorkflowIds.mockImplementation(
			async (workflowIds) => workflowIds,
		);
		collaborationService.broadcastWorkflowSettingsUpdated.mockResolvedValue(undefined);
		workflowFinderService.hasProjectScopeForUser.mockResolvedValue(true);
		workflowFinderService.findProjectIdForFolder.mockResolvedValue('project-1');

		service = new McpSettingsService(
			settingsRepository,
			cacheService,
			workflowRepository,
			workflowFinderService,
			globalConfig,
			logger,
			collaborationService,
		);
	});

	describe('getEnabled', () => {
		test('returns false by default when no setting exists', async () => {
			findByKey.mockResolvedValue(null);

			await expect(service.getEnabled()).resolves.toBe(false);
			expect(findByKey).toHaveBeenCalledWith('mcp.access.enabled');
		});

		test('returns true when setting value is "true"', async () => {
			findByKey.mockResolvedValue(
				mock<Settings>({ key: 'mcp.access.enabled', value: 'true', loadOnStartup: true }),
			);

			await expect(service.getEnabled()).resolves.toBe(true);
		});

		test('returns false when setting value is "false"', async () => {
			findByKey.mockResolvedValue(
				mock<Settings>({ key: 'mcp.access.enabled', value: 'false', loadOnStartup: true }),
			);

			await expect(service.getEnabled()).resolves.toBe(false);
		});
	});

	describe('setEnabled', () => {
		test('upserts setting with "true"', async () => {
			await service.setEnabled(true);

			expect(upsert).toHaveBeenCalledWith(
				{ key: 'mcp.access.enabled', value: 'true', loadOnStartup: true },
				['key'],
			);
		});

		test('upserts setting with "false"', async () => {
			await service.setEnabled(false);

			expect(upsert).toHaveBeenCalledWith(
				{ key: 'mcp.access.enabled', value: 'false', loadOnStartup: true },
				['key'],
			);
		});
	});

	describe('bulkSetAvailableInMCP', () => {
		const user = mock<User>({ id: 'user-1' });

		// Minimal `find`/`update` stub that behaves like an `EntityManager`
		// scoped to WorkflowEntity rows the test sets up.
		const createTransactionStubs = (seeded: Array<Partial<WorkflowEntity> & { id: string }>) => {
			const storage = new Map(
				seeded.map((w) => [w.id, { ...w, isArchived: w.isArchived ?? false }]),
			);

			const find = jest.fn(
				async (
					_entity: unknown,
					options: {
						where: { id: FindOperator<string[]>; isArchived: boolean };
						select?: Array<keyof WorkflowEntity>;
					},
				) => {
					const ids = options.where.id.value;
					return ids
						.map((id) => storage.get(id))
						.filter(
							(row): row is Partial<WorkflowEntity> & { id: string; isArchived: boolean } =>
								!!row && row.isArchived === options.where.isArchived,
						)
						.map((row) => ({ ...row }));
				},
			);

			const update = jest.fn(
				async (_entity: unknown, where: { id: string }, patch: Partial<WorkflowEntity>) => {
					const existing = storage.get(where.id);
					if (!existing) return;
					storage.set(where.id, { ...existing, ...patch });
				},
			);

			const trx = { find, update } as unknown as EntityManager;
			const manager = {
				transaction: jest.fn(async (run: (trx: EntityManager) => Promise<unknown>) => {
					return await run(trx);
				}),
			};

			return { trx, manager, find, update, storage };
		};

		const setupRepository = (seeded: Array<Partial<WorkflowEntity> & { id: string }>) => {
			const stubs = createTransactionStubs(seeded);
			Object.assign(workflowRepository, { manager: stubs.manager });
			return stubs;
		};

		test('throws BadRequestError when no scope is provided', async () => {
			const dto = new UpdateWorkflowsAvailabilityDto({ availableInMCP: true });

			await expect(service.bulkSetAvailableInMCP(user, dto)).rejects.toThrow(BadRequestError);
			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).not.toHaveBeenCalled();
			expect(workflowFinderService.findAllWorkflowIdsForUser).not.toHaveBeenCalled();
		});

		test('throws BadRequestError when multiple scopes are provided', async () => {
			const dto = new UpdateWorkflowsAvailabilityDto({
				availableInMCP: true,
				workflowIds: ['wf-1'],
				projectId: 'project-1',
			});

			await expect(service.bulkSetAvailableInMCP(user, dto)).rejects.toThrow(BadRequestError);
		});

		test('filters unauthorized ids and applies updates inside a transaction', async () => {
			const stubs = setupRepository([
				{ id: 'wf-1', settings: { saveManualExecutions: true } },
				{ id: 'wf-2', settings: { availableInMCP: false } },
			]);

			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(
				new Set(['wf-1', 'wf-2']),
			);

			const dto = new UpdateWorkflowsAvailabilityDto({
				availableInMCP: true,
				workflowIds: ['wf-1', 'wf-2', 'wf-unauthorized'],
			});

			const result = await service.bulkSetAvailableInMCP(user, dto);

			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).toHaveBeenCalledWith(
				['wf-1', 'wf-2', 'wf-unauthorized'],
				user,
				['workflow:update'],
			);
			expect(stubs.manager.transaction).toHaveBeenCalledTimes(1);
			expect(stubs.update).toHaveBeenCalledTimes(2);
			expect(result).toEqual({
				updatedCount: 2,
				updatedIds: ['wf-1', 'wf-2'],
				// wf-unauthorized was in the request but filtered out — counts as skipped.
				skippedCount: 1,
				failedCount: 0,
				changedWorkflows: [
					{
						workflowId: 'wf-1',
						settings: { availableInMCP: true },
						checksum: expect.stringMatching(/^[a-f0-9]{64}$/),
					},
					{
						workflowId: 'wf-2',
						settings: { availableInMCP: true },
						checksum: expect.stringMatching(/^[a-f0-9]{64}$/),
					},
				],
			});
		});

		test('computes checksum from the full persisted workflow snapshot with updated settings', async () => {
			const workflow = {
				id: 'wf-1',
				name: 'Workflow with checksum fields',
				description: 'Description included in checksum',
				nodes: [
					{
						id: 'node-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0] as [number, number],
						parameters: {},
					},
				],
				connections: {},
				settings: { saveManualExecutions: true, availableInMCP: false },
				meta: { templateCredsSetupCompleted: true },
				pinData: { 'Manual Trigger': [{ json: { value: 1 } }] },
				isArchived: false,
				activeVersionId: 'version-1',
			};
			setupRepository([workflow]);
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set(['wf-1']));
			const expectedSettings = { saveManualExecutions: true, availableInMCP: true };
			const expectedChecksum = await calculateWorkflowChecksum({
				...workflow,
				settings: expectedSettings,
			});

			const result = await service.bulkSetAvailableInMCP(
				user,
				new UpdateWorkflowsAvailabilityDto({
					availableInMCP: true,
					workflowIds: ['wf-1'],
				}),
			);

			expect(result.changedWorkflows).toEqual([
				{
					workflowId: 'wf-1',
					settings: { availableInMCP: true },
					checksum: expectedChecksum,
				},
			]);
		});

		test('skips archived workflows and reports them as skipped', async () => {
			const stubs = setupRepository([
				{ id: 'wf-1', settings: {}, isArchived: false },
				{ id: 'wf-2', settings: {}, isArchived: true },
			]);

			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(
				new Set(['wf-1', 'wf-2']),
			);

			const dto = new UpdateWorkflowsAvailabilityDto({
				availableInMCP: true,
				workflowIds: ['wf-1', 'wf-2'],
			});

			const result = await service.bulkSetAvailableInMCP(user, dto);

			expect(stubs.update).toHaveBeenCalledTimes(1);
			expect(stubs.update).toHaveBeenCalledWith(
				WorkflowEntity,
				{ id: 'wf-1' },
				expect.objectContaining({ settings: expect.objectContaining({ availableInMCP: true }) }),
			);
			expect(result).toEqual({
				updatedCount: 1,
				updatedIds: ['wf-1'],
				skippedCount: 1,
				failedCount: 0,
				changedWorkflows: [
					{
						workflowId: 'wf-1',
						settings: { availableInMCP: true },
						checksum: expect.stringMatching(/^[a-f0-9]{64}$/),
					},
				],
			});
		});

		test('treats no-op updates as already-in-state for idempotency', async () => {
			const stubs = setupRepository([
				// Will be written (value differs).
				{ id: 'wf-1', settings: { availableInMCP: false } },
				// No-op — already in the requested state.
				{ id: 'wf-2', settings: { availableInMCP: true } },
			]);

			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(
				new Set(['wf-1', 'wf-2']),
			);

			const dto = new UpdateWorkflowsAvailabilityDto({
				availableInMCP: true,
				workflowIds: ['wf-1', 'wf-2'],
			});

			const result = await service.bulkSetAvailableInMCP(user, dto);

			// Only wf-1 needed a real write. wf-2 was already in the target state.
			expect(stubs.update).toHaveBeenCalledTimes(1);
			expect(stubs.find).toHaveBeenCalledTimes(2);
			expect(stubs.find.mock.calls[0][1].select).toEqual(['id', 'settings']);
			expect(stubs.find.mock.calls[1][1].where.id.value).toEqual(['wf-1']);
			// Both ids are reported as updated (the DB is in the requested state
			// for both). No-ops go last in the list.
			expect(result).toEqual({
				updatedCount: 2,
				updatedIds: ['wf-1', 'wf-2'],
				skippedCount: 0,
				failedCount: 0,
				changedWorkflows: [
					{
						workflowId: 'wf-1',
						settings: { availableInMCP: true },
						checksum: expect.stringMatching(/^[a-f0-9]{64}$/),
					},
				],
			});
		});

		test('idempotent when all workflows are already in requested state', async () => {
			const stubs = setupRepository([
				{ id: 'wf-1', settings: { availableInMCP: true } },
				{ id: 'wf-2', settings: { availableInMCP: true } },
			]);

			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(
				new Set(['wf-1', 'wf-2']),
			);

			const dto = new UpdateWorkflowsAvailabilityDto({
				availableInMCP: true,
				workflowIds: ['wf-1', 'wf-2'],
			});

			const result = await service.bulkSetAvailableInMCP(user, dto);

			expect(stubs.update).not.toHaveBeenCalled();
			expect(stubs.find).toHaveBeenCalledTimes(1);
			expect(result).toEqual({
				updatedCount: 2,
				updatedIds: ['wf-1', 'wf-2'],
				skippedCount: 0,
				failedCount: 0,
				changedWorkflows: [],
			});
		});

		test('resolves candidates via findAllWorkflowIdsForUser when scoped by projectId', async () => {
			const stubs = setupRepository([{ id: 'wf-1', settings: {} }]);
			workflowFinderService.findAllWorkflowIdsForUser.mockResolvedValue(['wf-1']);

			const dto = new UpdateWorkflowsAvailabilityDto({
				availableInMCP: true,
				projectId: 'project-1',
			});

			const result = await service.bulkSetAvailableInMCP(user, dto);

			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).not.toHaveBeenCalled();
			expect(workflowFinderService.hasProjectScopeForUser).toHaveBeenCalledWith(
				user,
				['workflow:update'],
				'project-1',
			);
			expect(workflowFinderService.findAllWorkflowIdsForUser).toHaveBeenCalledWith(
				user,
				['workflow:update'],
				undefined,
				'project-1',
			);
			expect(stubs.update).toHaveBeenCalledTimes(1);
			expect(result.updatedCount).toBe(1);
		});

		test('does not resolve project-scoped workflows when user lacks project scope', async () => {
			const stubs = setupRepository([]);
			workflowFinderService.hasProjectScopeForUser.mockResolvedValueOnce(false);

			const dto = new UpdateWorkflowsAvailabilityDto({
				availableInMCP: true,
				projectId: 'project-1',
			});

			const result = await service.bulkSetAvailableInMCP(user, dto);

			expect(workflowFinderService.findAllWorkflowIdsForUser).not.toHaveBeenCalled();
			expect(stubs.manager.transaction).not.toHaveBeenCalled();
			expect(result).toEqual({
				updatedCount: 0,
				skippedCount: 0,
				failedCount: 0,
				changedWorkflows: [],
			});
		});

		test('omits updatedIds from the response when scoped by projectId', async () => {
			setupRepository([
				{ id: 'wf-1', settings: {} },
				{ id: 'wf-2', settings: {} },
			]);
			workflowFinderService.findAllWorkflowIdsForUser.mockResolvedValue(['wf-1', 'wf-2']);

			const dto = new UpdateWorkflowsAvailabilityDto({
				availableInMCP: true,
				projectId: 'project-1',
			});

			const result = await service.bulkSetAvailableInMCP(user, dto);

			expect(result).toEqual({
				updatedCount: 2,
				skippedCount: 0,
				failedCount: 0,
				changedWorkflows: [
					{
						workflowId: 'wf-1',
						settings: { availableInMCP: true },
						checksum: expect.stringMatching(/^[a-f0-9]{64}$/),
					},
					{
						workflowId: 'wf-2',
						settings: { availableInMCP: true },
						checksum: expect.stringMatching(/^[a-f0-9]{64}$/),
					},
				],
			});
			expect(result).not.toHaveProperty('updatedIds');
		});

		test('omits updatedIds from the response when scoped by folderId', async () => {
			setupRepository([{ id: 'wf-1', settings: {} }]);
			workflowFinderService.findAllWorkflowIdsForUser.mockResolvedValue(['wf-1']);

			const dto = new UpdateWorkflowsAvailabilityDto({
				availableInMCP: true,
				folderId: 'folder-1',
			});

			const result = await service.bulkSetAvailableInMCP(user, dto);

			expect(result).toEqual({
				updatedCount: 1,
				skippedCount: 0,
				failedCount: 0,
				changedWorkflows: [
					{
						workflowId: 'wf-1',
						settings: { availableInMCP: true },
						checksum: expect.stringMatching(/^[a-f0-9]{64}$/),
					},
				],
			});
			expect(result).not.toHaveProperty('updatedIds');
		});

		test('resolves candidates via findAllWorkflowIdsForUser when scoped by folderId', async () => {
			setupRepository([{ id: 'wf-1', settings: {} }]);
			workflowFinderService.findAllWorkflowIdsForUser.mockResolvedValue(['wf-1']);

			const dto = new UpdateWorkflowsAvailabilityDto({
				availableInMCP: true,
				folderId: 'folder-1',
			});

			await service.bulkSetAvailableInMCP(user, dto);

			expect(workflowFinderService.findProjectIdForFolder).toHaveBeenCalledWith('folder-1');
			expect(workflowFinderService.hasProjectScopeForUser).toHaveBeenCalledWith(
				user,
				['workflow:update'],
				'project-1',
			);
			expect(workflowFinderService.findAllWorkflowIdsForUser).toHaveBeenCalledWith(
				user,
				['workflow:update'],
				'folder-1',
				'project-1',
			);
		});

		test('does not resolve folder-scoped workflows when folder project cannot be scoped', async () => {
			const stubs = setupRepository([]);
			workflowFinderService.findProjectIdForFolder.mockResolvedValueOnce(null);

			const dto = new UpdateWorkflowsAvailabilityDto({
				availableInMCP: true,
				folderId: 'folder-1',
			});

			const result = await service.bulkSetAvailableInMCP(user, dto);

			expect(workflowFinderService.hasProjectScopeForUser).not.toHaveBeenCalled();
			expect(workflowFinderService.findAllWorkflowIdsForUser).not.toHaveBeenCalled();
			expect(stubs.manager.transaction).not.toHaveBeenCalled();
			expect(result).toEqual({
				updatedCount: 0,
				skippedCount: 0,
				failedCount: 0,
				changedWorkflows: [],
			});
		});

		test('returns zeroed result and does not open a transaction when no candidates are found', async () => {
			const stubs = setupRepository([]);
			workflowFinderService.findAllWorkflowIdsForUser.mockResolvedValue([]);

			const dto = new UpdateWorkflowsAvailabilityDto({
				availableInMCP: true,
				projectId: 'empty-project',
			});

			const result = await service.bulkSetAvailableInMCP(user, dto);

			expect(stubs.manager.transaction).not.toHaveBeenCalled();
			expect(result).toEqual({
				updatedCount: 0,
				skippedCount: 0,
				failedCount: 0,
				changedWorkflows: [],
			});
			expect(result).not.toHaveProperty('updatedIds');
		});

		test('returns an empty updatedIds array when scoped by workflowIds and none are accessible', async () => {
			setupRepository([]);
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set());

			const dto = new UpdateWorkflowsAvailabilityDto({
				availableInMCP: true,
				workflowIds: ['wf-1', 'wf-2'],
			});

			const result = await service.bulkSetAvailableInMCP(user, dto);

			expect(result).toEqual({
				updatedCount: 0,
				skippedCount: 2,
				failedCount: 0,
				changedWorkflows: [],
				updatedIds: [],
			});
		});

		test('chunks large candidate sets into one transaction per chunk', async () => {
			// 600 workflows -> chunked into 500 + 100 with BULK_CHUNK_SIZE = 500.
			const seeded = Array.from({ length: 600 }, (_, i) => ({
				id: `wf-${i}`,
				settings: {} as Record<string, unknown>,
			}));
			const stubs = setupRepository(seeded);

			workflowFinderService.findAllWorkflowIdsForUser.mockResolvedValue(seeded.map((w) => w.id));

			const dto = new UpdateWorkflowsAvailabilityDto({
				availableInMCP: true,
				projectId: 'project-big',
			});

			const result = await service.bulkSetAvailableInMCP(user, dto);

			// Two transactions (one per chunk), each with a settings pass and checksum pass.
			expect(stubs.manager.transaction).toHaveBeenCalledTimes(2);
			expect(stubs.find).toHaveBeenCalledTimes(4);
			expect(result.updatedCount).toBe(600);
			expect(result.failedCount).toBe(0);
		});

		test('continues processing when a chunk transaction fails, and reports failedCount', async () => {
			// 600 workflows -> 2 chunks
			const seeded = Array.from({ length: 600 }, (_, i) => ({
				id: `wf-${i}`,
				settings: {} as Record<string, unknown>,
			}));
			const stubs = setupRepository(seeded);

			workflowFinderService.findAllWorkflowIdsForUser.mockResolvedValue(seeded.map((w) => w.id));

			// Force the first chunk's transaction to fail; the second runs normally.
			const originalTransaction = stubs.manager.transaction;
			stubs.manager.transaction
				.mockImplementationOnce(async () => {
					throw new Error('chunk transaction failed');
				})
				.mockImplementationOnce(originalTransaction.getMockImplementation()!);

			const dto = new UpdateWorkflowsAvailabilityDto({
				availableInMCP: true,
				projectId: 'project-big',
			});

			const result = await service.bulkSetAvailableInMCP(user, dto);

			expect(stubs.manager.transaction).toHaveBeenCalledTimes(2);
			// Second chunk (100 workflows) committed successfully.
			expect(result.updatedCount).toBe(100);
			// First chunk (500 workflows) is counted as failed — the
			// transaction rolled back so no rows were written.
			expect(result.failedCount).toBe(500);
			expect(result.skippedCount).toBe(0);
			expect(logger.error).toHaveBeenCalledWith(
				expect.stringContaining('Failed to bulk-update workflow MCP availability'),
				expect.objectContaining({
					error: expect.any(Error),
					chunkSize: 500,
					chunkStart: 0,
					availableInMCP: true,
				}),
			);
		});

		test('surfaces chunk failures in updatedIds when scoped by workflowIds', async () => {
			const stubs = setupRepository([{ id: 'wf-1', settings: {} }]);
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set(['wf-1']));

			stubs.manager.transaction.mockImplementationOnce(async () => {
				throw new Error('chunk transaction failed');
			});

			const dto = new UpdateWorkflowsAvailabilityDto({
				availableInMCP: true,
				workflowIds: ['wf-1'],
			});

			const result = await service.bulkSetAvailableInMCP(user, dto);

			expect(result).toEqual({
				updatedCount: 0,
				skippedCount: 0,
				failedCount: 1,
				changedWorkflows: [],
				updatedIds: [],
			});
		});

		test('commits successful chunks independently when a later chunk fails', async () => {
			const seeded = Array.from({ length: 600 }, (_, i) => ({
				id: `wf-${i}`,
				settings: { availableInMCP: false } as Record<string, unknown>,
			}));
			const stubs = setupRepository(seeded);

			workflowFinderService.findAllWorkflowIdsForUser.mockResolvedValue(seeded.map((w) => w.id));

			const originalTransaction = stubs.manager.transaction.getMockImplementation()!;
			stubs.manager.transaction
				.mockImplementationOnce(originalTransaction)
				.mockImplementationOnce(async () => {
					throw new Error('second chunk failed');
				});

			const dto = new UpdateWorkflowsAvailabilityDto({
				availableInMCP: true,
				projectId: 'project-big',
			});

			const result = await service.bulkSetAvailableInMCP(user, dto);

			expect(result.updatedCount).toBe(500);
			expect(result.failedCount).toBe(100);
			expect(stubs.storage.get('wf-0')?.settings?.availableInMCP).toBe(true);
			expect(stubs.storage.get('wf-499')?.settings?.availableInMCP).toBe(true);
			expect(stubs.storage.get('wf-500')?.settings?.availableInMCP).toBe(false);
			expect(stubs.storage.get('wf-599')?.settings?.availableInMCP).toBe(false);
		});

		test('deduplicates workflowIds before looking up access', async () => {
			setupRepository([{ id: 'wf-1', settings: {} }]);
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set(['wf-1']));

			const dto = new UpdateWorkflowsAvailabilityDto({
				availableInMCP: true,
				workflowIds: ['wf-1', 'wf-1', 'wf-1'],
			});

			await service.bulkSetAvailableInMCP(user, dto);

			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).toHaveBeenCalledWith(
				['wf-1'],
				user,
				['workflow:update'],
			);
		});
	});

	describe('broadcastWorkflowMCPAvailabilityChanged', () => {
		const change = (workflowId: string, availableInMCP: boolean) => ({
			workflowId,
			settings: { availableInMCP },
			checksum: `checksum-${workflowId}`,
		});

		test('broadcasts a precomputed settings update with checksum', async () => {
			await service.broadcastWorkflowMCPAvailabilityChanged([change('wf-1', true)]);

			expect(collaborationService.filterOpenWorkflowIds).toHaveBeenCalledWith(['wf-1']);
			expect(workflowRepository.find).not.toHaveBeenCalled();
			expect(collaborationService.broadcastWorkflowSettingsUpdated).toHaveBeenCalledTimes(1);
			expect(collaborationService.broadcastWorkflowSettingsUpdated).toHaveBeenCalledWith(
				'wf-1',
				{ availableInMCP: true },
				'checksum-wf-1',
			);
		});

		test('broadcasts only changed workflows that are open', async () => {
			collaborationService.filterOpenWorkflowIds.mockResolvedValueOnce(['wf-2']);

			await service.broadcastWorkflowMCPAvailabilityChanged([
				change('wf-1', true),
				change('wf-2', true),
			]);

			expect(workflowRepository.find).not.toHaveBeenCalled();
			expect(collaborationService.broadcastWorkflowSettingsUpdated).toHaveBeenCalledTimes(1);
			expect(collaborationService.broadcastWorkflowSettingsUpdated).toHaveBeenCalledWith(
				'wf-2',
				{ availableInMCP: true },
				'checksum-wf-2',
			);
		});

		test('does not fail when one workflow broadcast throws', async () => {
			collaborationService.broadcastWorkflowSettingsUpdated
				.mockRejectedValueOnce(new Error('push down'))
				.mockResolvedValueOnce(undefined);

			await expect(
				service.broadcastWorkflowMCPAvailabilityChanged([
					change('wf-1', false),
					change('wf-2', false),
				]),
			).resolves.toBeUndefined();

			expect(collaborationService.broadcastWorkflowSettingsUpdated).toHaveBeenCalledTimes(2);
			expect(logger.warn).toHaveBeenCalledWith('Failed to broadcast workflow settings update', {
				workflowId: 'wf-1',
				cause: 'push down',
			});
		});

		test('does not load workflows when there are no changes', async () => {
			await service.broadcastWorkflowMCPAvailabilityChanged([]);

			expect(collaborationService.filterOpenWorkflowIds).not.toHaveBeenCalled();
			expect(workflowRepository.find).not.toHaveBeenCalled();
			expect(collaborationService.broadcastWorkflowSettingsUpdated).not.toHaveBeenCalled();
		});

		test('does not load workflows when none of the changed workflows are open', async () => {
			collaborationService.filterOpenWorkflowIds.mockResolvedValueOnce([]);

			await service.broadcastWorkflowMCPAvailabilityChanged([change('wf-1', true)]);

			expect(workflowRepository.find).not.toHaveBeenCalled();
			expect(collaborationService.broadcastWorkflowSettingsUpdated).not.toHaveBeenCalled();
		});

		test('logs and returns when open workflow filtering fails', async () => {
			collaborationService.filterOpenWorkflowIds.mockRejectedValueOnce(new Error('cache down'));

			await expect(
				service.broadcastWorkflowMCPAvailabilityChanged([change('wf-1', true)]),
			).resolves.toBeUndefined();

			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to resolve open workflows for settings update broadcast',
				{
					workflowCount: 1,
					workflowIds: ['wf-1'],
					cause: 'cache down',
				},
			);
			expect(workflowRepository.find).not.toHaveBeenCalled();
			expect(collaborationService.broadcastWorkflowSettingsUpdated).not.toHaveBeenCalled();
		});
	});
});
