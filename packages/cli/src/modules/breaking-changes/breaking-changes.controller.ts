import {
	BreakingChangeInstanceRuleResult,
	BreakingChangeLightReportResult,
	BreakingChangeReportQueryDto,
	BreakingChangeWorkflowRuleResult,
	WorkflowMigrationResult,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, RestController, GlobalScope, Query, Post, Param } from '@n8n/decorators';
import { Response } from 'express';

import { NotFoundError } from '@n8n/errors';

import { BreakingChangeMigrationService } from './breaking-changes.migration.service';
import { BreakingChangeService } from './breaking-changes.service';
import { MigrationFindingQueryService } from './query/migration-finding-query.service';
import { MigrationFindingSyncService } from './sync/migration-finding-sync.service';

@RestController('/breaking-changes')
export class BreakingChangesController {
	constructor(
		private readonly service: BreakingChangeService,
		private readonly migrationService: BreakingChangeMigrationService,
		private readonly syncService: MigrationFindingSyncService,
		private readonly queryService: MigrationFindingQueryService,
	) {}

	/**
	 * The report overview, read from the finding table. A first read, or a
	 * changed rule set, fills the table before the read.
	 */
	@Get('/report')
	@GlobalScope('breakingChanges:list')
	async getDetectionReport(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: BreakingChangeReportQueryDto,
	): Promise<BreakingChangeLightReportResult> {
		const version = query.version ?? 'v2';
		await this.syncService.syncIfStale(version);
		return await this.queryService.getLightReport(version);
	}

	/** Re-scans every workflow, updates the finding table, and returns the fresh overview. */
	@Post('/report/refresh')
	@GlobalScope('breakingChanges:list')
	async refreshCache(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: BreakingChangeReportQueryDto,
	): Promise<BreakingChangeLightReportResult> {
		const version = query.version ?? 'v2';
		await this.syncService.sync(version);
		return await this.queryService.getLightReport(version);
	}

	/**
	 * Get specific breaking change rules
	 */
	@Get('/report/:ruleId')
	@GlobalScope('breakingChanges:list')
	async getDetectionReportForRule(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('ruleId') ruleId: string,
	): Promise<BreakingChangeInstanceRuleResult | BreakingChangeWorkflowRuleResult> {
		const result = await this.service.getDetectionReportForRule(ruleId);
		if (!result) {
			throw new NotFoundError(`Breaking change rule with ID '${ruleId}' not found.`);
		}
		return result;
	}

	/**
	 * Apply the rule's automated migration to a single workflow, saving the
	 * rewritten workflow as a new version.
	 */
	@Post('/report/:ruleId/workflows/:workflowId/migrate')
	@GlobalScope('breakingChanges:migrate')
	async migrateWorkflow(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('ruleId') ruleId: string,
		@Param('workflowId') workflowId: string,
	): Promise<WorkflowMigrationResult> {
		return await this.migrationService.migrateWorkflow(ruleId, workflowId, req.user);
	}
}
