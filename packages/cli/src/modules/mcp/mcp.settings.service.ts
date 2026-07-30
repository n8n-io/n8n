import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { SettingsRepository, WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { In } from '@n8n/typeorm';
import {
	calculateWorkflowChecksum,
	jsonParse,
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
const REDIRECT_URIS_KEY = 'mcp.oauth.allowedRedirectUris';

const BULK_CHUNK_SIZE = 500;

const WORKFLOW_SETTINGS_FIELDS: Array<keyof WorkflowEntity> = ['id', 'settings'];

type BulkSetAvailableInMCPResult = {
	updatedCount: number;
	unchangedCount: number;
	skippedCount: number;
	failedCount: number;
	changedWorkflows: WorkflowMCPAvailabilityChange[];
	updatedIds?: string[];
	unchangedIds?: string[];
};

type WorkflowMCPAvailabilityChange = {
	workflowId: string;
	settings: Pick<IWorkflowSettings, 'availableInMCP'>;
	/** Present only for workflows that had an open editor session when the update ran. */
	checksum?: string;
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

	async getAllowedRedirectUris(): Promise<string[]> {
		const cachedUris = await this.cacheService.get<string>(REDIRECT_URIS_KEY);

		if (cachedUris !== undefined) {
			return jsonParse<string[]>(cachedUris, { fallbackValue: [] });
		}

		const row = await this.settingsRepository.findByKey(REDIRECT_URIS_KEY);

		const uris: string[] = row?.value ? jsonParse<string[]>(row.value, { fallbackValue: [] }) : [];

		await this.cacheService.set(REDIRECT_URIS_KEY, JSON.stringify(uris));

		return uris;
	}

	async setAllowedRedirectUris(uris: string[]): Promise<void> {
		await this.settingsRepository.upsert(
			{ key: REDIRECT_URIS_KEY, value: JSON.stringify(uris), loadOnStartup: true },
			['key'],
		);

		await this.cacheService.set(REDIRECT_URIS_KEY, JSON.stringify(uris));
	}

	async bulkSetAvailableInMCP(
		user: User,
		dto: UpdateWorkflowsAvailabilityDto,
	): Promise<BulkSetAvailableInMCPResult> {
		const { availableInMCP, workflowIds, projectId, folderId, allWorkflows } = dto;

		const scopeCount = [workflowIds, projectId, folderId, allWorkflows].filter(Boolean).length;
		if (scopeCount !== 1) {
			throw new BadRequestError(
				'Provide exactly one of workflowIds, projectId, folderId or allWorkflows',
			);
		}

		const candidateIds = await this.resolveCandidateIds(user, {
			workflowIds,
			projectId,
			folderId,
			allWorkflows,
		});

		const isWorkflowIdsScope = Boolean(workflowIds);
		const baselineSize = isWorkflowIdsScope ? new Set(workflowIds).size : candidateIds.length;

		if (candidateIds.length === 0) {
			return {
				updatedCount: 0,
				unchangedCount: 0,
				skippedCount: baselineSize,
				failedCount: 0,
				changedWorkflows: [],
				...(isWorkflowIdsScope ? { updatedIds: [], unchangedIds: [] } : {}),
			};
		}

		// Checksums are only consumed by collaboration pushes to open editors, and
		// computing one requires the full workflow body. Resolve which candidates
		// are open once, up front, so chunks only load bodies for those few.
		let openWorkflowIds: Set<string>;
		try {
			openWorkflowIds = new Set(
				await this.collaborationService.filterOpenWorkflowIds(candidateIds),
			);
		} catch (error) {
			openWorkflowIds = new Set();
			this.logger.warn('Failed to resolve open workflows before bulk MCP availability update', {
				cause: error instanceof Error ? error.message : String(error),
			});
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

					const openIdsInChunk = [...nextSettingsByWorkflowId.keys()].filter((id) =>
						openWorkflowIds.has(id),
					);
					const checksumRows =
						openIdsInChunk.length > 0
							? await trx.find(WorkflowEntity, {
									where: { id: In(openIdsInChunk), isArchived: false },
									select: ['id', ...WORKFLOW_CHECKSUM_FIELDS],
								})
							: [];
					const checksumRowByWorkflowId = new Map(checksumRows.map((row) => [row.id, row]));

					for (const [workflowId, nextSettings] of nextSettingsByWorkflowId) {
						await trx.update(
							WorkflowEntity,
							{ id: workflowId, isArchived: false },
							{ settings: nextSettings, updatedAt: now },
						);

						// Checksum reflects this transaction's post-commit state.
						// A concurrent write after commit may make it stale, which is acceptable for a settings-only toggle.
						const checksumRow = checksumRowByWorkflowId.get(workflowId);
						const checksum = checksumRow
							? await calculateWorkflowChecksum({ ...checksumRow, settings: nextSettings })
							: undefined;

						chunkWritten.push({
							workflowId,
							settings: { availableInMCP },
							...(checksum === undefined ? {} : { checksum }),
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

		return {
			updatedCount: writtenIds.length,
			unchangedCount: noOpIds.length,
			skippedCount: Math.max(0, baselineSize - writtenIds.length - noOpIds.length - failedCount),
			failedCount,
			changedWorkflows,
			...(isWorkflowIdsScope ? { updatedIds: writtenIds, unchangedIds: noOpIds } : {}),
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
			allWorkflows?: boolean;
		},
	): Promise<string[]> {
		if (scope.allWorkflows) {
			return await this.workflowFinderService.findAllWorkflowIdsForUser(user, ['workflow:update']);
		}

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
