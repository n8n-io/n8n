import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { SettingsRepository, WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { In } from '@n8n/typeorm';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { CacheService } from '@/services/cache/cache.service';
import { removeDefaultValues } from '@/workflow-helpers';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { UpdateWorkflowsAvailabilityDto } from './dto/update-workflows-availability.dto';

const KEY = 'mcp.access.enabled';

/** Max workflows fetched / updated per chunk inside the transaction. */
const BULK_CHUNK_SIZE = 500;

type BulkSetAvailableInMCPResult = {
	updatedCount: number;
	updatedIds: string[];
	skippedCount: number;
};

@Service()
export class McpSettingsService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly cacheService: CacheService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly globalConfig: GlobalConfig,
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

		const baselineSize = workflowIds ? new Set(workflowIds).size : candidateIds.length;

		if (candidateIds.length === 0) {
			return { updatedCount: 0, updatedIds: [], skippedCount: baselineSize };
		}

		const writtenIds: string[] = [];
		const noOpIds: string[] = [];

		await this.workflowRepository.manager.transaction(async (trx) => {
			const now = new Date();

			// Process workflows in chunks of BULK_CHUNK_SIZE
			for (let start = 0; start < candidateIds.length; start += BULK_CHUNK_SIZE) {
				const chunk = candidateIds.slice(start, start + BULK_CHUNK_SIZE);

				const rows = await trx.find(WorkflowEntity, {
					where: { id: In(chunk), isArchived: false },
					select: ['id', 'settings'],
				});

				for (const row of rows) {
					if (row.settings?.availableInMCP === availableInMCP) {
						noOpIds.push(row.id);
						continue;
					}

					const nextSettings = removeDefaultValues(
						{ ...(row.settings ?? {}), availableInMCP },
						this.globalConfig.executions.timeout,
					);

					await trx.update(
						WorkflowEntity,
						{ id: row.id },
						{ settings: nextSettings, updatedAt: now },
					);

					writtenIds.push(row.id);
				}
			}
		});

		// To make the endpoint idempotent, we still count no-ops (workflows that are already in the requested state) as updated
		const confirmedIds = [...writtenIds, ...noOpIds];

		return {
			updatedCount: confirmedIds.length,
			updatedIds: confirmedIds,
			skippedCount: baselineSize - confirmedIds.length,
		};
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

		return await this.workflowFinderService.findAllWorkflowIdsForUser(
			user,
			['workflow:update'],
			scope.folderId,
			scope.projectId,
		);
	}
}
