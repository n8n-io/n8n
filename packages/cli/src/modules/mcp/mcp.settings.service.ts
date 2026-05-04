import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { SettingsRepository, WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { In } from '@n8n/typeorm';
import {
	calculateWorkflowChecksum,
	WORKFLOW_CHECKSUM_FIELDS,
	type IWorkflowSettings,
} from 'n8n-workflow';

import { CollaborationService } from '@/collaboration/collaboration.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { CacheService } from '@/services/cache/cache.service';
import { removeDefaultValues } from '@/workflow-helpers';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { UpdateWorkflowsAvailabilityDto } from './dto/update-workflows-availability.dto';

const KEY = 'mcp.access.enabled';

const BULK_CHUNK_SIZE = 500;

const WORKFLOW_SETTINGS_FIELDS: Array<keyof WorkflowEntity> = ['id', 'settings'];

type BulkSetAvailableInMCPResult = {
	updatedCount: number;
	skippedCount: number;
	failedCount: number;
	changedWorkflows: WorkflowMCPAvailabilityChange[];
	updatedIds?: string[];
};

type WorkflowMCPAvailabilityChange = {
	workflowId: string;
	settings: Pick<IWorkflowSettings, 'availableInMCP'>;
	checksum: string;
};

@Service()
export class McpSettingsService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly cacheService: CacheService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
		private readonly collaborationService: CollaborationService,
	) {}

	async getEnabled(): Promise<boolean> {
		const isMcpAccessEnabled = await this.cacheService.get<string>(KEY);

		if (isMcpAccessEnabled !== undefined) {
			return isMcpAccessEnabled === 'true';
		}

		const row = await this.settingsRepository.findByKey(KEY);

		const enabled = row?.value === 'true';

		await this.cacheService.set(KEY, enabled.toString());

		return enabled;
	}

	async setEnabled(enabled: boolean): Promise<void> {
		await this.settingsRepository.upsert(
			{ key: KEY, value: enabled.toString(), loadOnStartup: true },
			['key'],
		);

		await this.cacheService.set(KEY, enabled.toString());
	}

	async bulkSetAvailableInMCP(
		user: User,
		dto: UpdateWorkflowsAvailabilityDto,
	): Promise<BulkSetAvailableInMCPResult> {
		const { availableInMCP, workflowIds, projectId, folderId } = dto;

		const scopeCount = [workflowIds, projectId, folderId].filter(Boolean).length;
		if (scopeCount !== 1) {
			throw new BadRequestError('Provide exactly one of workflowIds, projectId or folderId');
		}

		const candidateIds = await this.resolveCandidateIds(user, {
			workflowIds,
			projectId,
			folderId,
		});

		const isWorkflowIdsScope = Boolean(workflowIds);
		const baselineSize = isWorkflowIdsScope ? new Set(workflowIds).size : candidateIds.length;

		if (candidateIds.length === 0) {
			return {
				updatedCount: 0,
				skippedCount: baselineSize,
				failedCount: 0,
				changedWorkflows: [],
				...(isWorkflowIdsScope ? { updatedIds: [] } : {}),
			};
		}

		const writtenIds: string[] = [];
		const changedWorkflows: WorkflowMCPAvailabilityChange[] = [];
		const noOpIds: string[] = [];
		let failedCount = 0;

		for (let start = 0; start < candidateIds.length; start += BULK_CHUNK_SIZE) {
			const chunk = candidateIds.slice(start, start + BULK_CHUNK_SIZE);

			try {
				const chunkResult = await this.workflowRepository.manager.transaction(async (trx) => {
					const chunkWritten: WorkflowMCPAvailabilityChange[] = [];
					const chunkNoOp: string[] = [];
					const now = new Date();

					const settingsRows = await trx.find(WorkflowEntity, {
						where: { id: In(chunk), isArchived: false },
						select: WORKFLOW_SETTINGS_FIELDS,
					});
					const nextSettingsByWorkflowId = new Map<string, IWorkflowSettings>();

					for (const row of settingsRows) {
						if (row.settings?.availableInMCP === availableInMCP) {
							chunkNoOp.push(row.id);
							continue;
						}

						const nextSettings = removeDefaultValues(
							{ ...(row.settings ?? {}), availableInMCP },
							this.globalConfig.executions.timeout,
						);

						nextSettingsByWorkflowId.set(row.id, nextSettings);
					}

					if (nextSettingsByWorkflowId.size === 0) {
						return { written: chunkWritten, noOp: chunkNoOp };
					}

					const rows = await trx.find(WorkflowEntity, {
						where: { id: In([...nextSettingsByWorkflowId.keys()]), isArchived: false },
						select: ['id', ...WORKFLOW_CHECKSUM_FIELDS],
					});

					for (const row of rows) {
						const nextSettings = nextSettingsByWorkflowId.get(row.id);
						if (nextSettings === undefined) continue;

						await trx.update(
							WorkflowEntity,
							{ id: row.id },
							{ settings: nextSettings, updatedAt: now },
						);
						// Checksum reflects this transaction's post-commit state.
						// A concurrent write after commit may make it stale, which is acceptable for a settings-only toggle.
						const checksum = await calculateWorkflowChecksum({
							...row,
							settings: nextSettings,
						});

						chunkWritten.push({
							workflowId: row.id,
							settings: { availableInMCP },
							checksum,
						});
					}

					return { written: chunkWritten, noOp: chunkNoOp };
				});

				writtenIds.push(...chunkResult.written.map(({ workflowId }) => workflowId));
				changedWorkflows.push(...chunkResult.written);
				noOpIds.push(...chunkResult.noOp);
			} catch (error) {
				failedCount += chunk.length;
				this.logger.error('Failed to bulk-update workflow MCP availability for chunk', {
					error,
					chunkSize: chunk.length,
					chunkStart: start,
					availableInMCP,
				});
			}
		}

		const confirmedIds = [...writtenIds, ...noOpIds];

		return {
			updatedCount: confirmedIds.length,
			skippedCount: Math.max(0, baselineSize - confirmedIds.length - failedCount),
			failedCount,
			changedWorkflows,
			...(isWorkflowIdsScope ? { updatedIds: confirmedIds } : {}),
		};
	}

	async broadcastWorkflowMCPAvailabilityChanged(
		changes: WorkflowMCPAvailabilityChange[],
	): Promise<void> {
		if (changes.length === 0) return;

		const workflowIds = changes.map(({ workflowId }) => workflowId);

		let openWorkflowIds: string[];
		try {
			openWorkflowIds = await this.collaborationService.filterOpenWorkflowIds(workflowIds);
		} catch (error) {
			this.logger.warn('Failed to resolve open workflows for settings update broadcast', {
				workflowCount: changes.length,
				workflowIds: workflowIds.slice(0, 10),
				cause: error instanceof Error ? error.message : String(error),
			});
			return;
		}

		if (openWorkflowIds.length === 0) return;

		const changesByWorkflowId = new Map(changes.map((change) => [change.workflowId, change]));

		await Promise.all(
			openWorkflowIds.map(async (workflowId) => {
				try {
					const change = changesByWorkflowId.get(workflowId);
					if (!change) return;

					await this.collaborationService.broadcastWorkflowSettingsUpdated(
						workflowId,
						change.settings,
						change.checksum,
					);
				} catch (error) {
					this.logger.warn('Failed to broadcast workflow settings update', {
						workflowId,
						cause: error instanceof Error ? error.message : String(error),
					});
				}
			}),
		);
	}

	private async resolveCandidateIds(
		user: User,
		scope: {
			workflowIds?: string[];
			projectId?: string;
			folderId?: string;
		},
	): Promise<string[]> {
		if (scope.workflowIds) {
			const uniqueIds = [...new Set(scope.workflowIds)];
			const accessibleIds = await this.workflowFinderService.findWorkflowIdsWithScopeForUser(
				uniqueIds,
				user,
				['workflow:update'],
			);
			return uniqueIds.filter((id) => accessibleIds.has(id));
		}

		const projectId =
			scope.projectId ??
			(scope.folderId
				? await this.workflowFinderService.findProjectIdForFolder(scope.folderId)
				: null);

		if (
			projectId === null ||
			!(await this.workflowFinderService.hasProjectScopeForUser(
				user,
				['workflow:update'],
				projectId,
			))
		) {
			return [];
		}

		return await this.workflowFinderService.findAllWorkflowIdsForUser(
			user,
			['workflow:update'],
			scope.folderId,
			projectId,
		);
	}
}
