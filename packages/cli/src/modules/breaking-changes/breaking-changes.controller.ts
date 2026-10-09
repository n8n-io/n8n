import {
	BreakingChangeLightReportResult,
	BreakingChangeReportQueryDto,
	BreakingChangeRuleDetailResult,
	BreakingChangeVersion,
	UpdateMigrationFindingStatusRequestDto,
	WorkflowMigrationResult,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, RestController, GlobalScope, Query, Patch, Post, Param } from '@n8n/decorators';
import { NotFoundError } from '@n8n/errors';
import { Response } from 'express';

import { BreakingChangeMigrationService } from './breaking-changes.migration.service';
import { RuleRegistry } from './breaking-changes.rule-registry.service';
import { MigrationFindingQueryService } from './query/migration-finding-query.service';
import { MigrationFindingSyncService } from './sync/migration-finding-sync.service';
import { MigrationFindingTriageService } from './triage/migration-finding-triage.service';
import { isWorkflowLevelRule } from './types';

/** The version the report targets when the request names none. */
const DEFAULT_TARGET_VERSION: BreakingChangeVersion = 'v2';

@RestController('/breaking-changes')
export class BreakingChangesController {
	constructor(
		private readonly migrationService: BreakingChangeMigrationService,
		private readonly syncService: MigrationFindingSyncService,
		private readonly queryService: MigrationFindingQueryService,
		private readonly ruleRegistry: RuleRegistry,
		private readonly triageService: MigrationFindingTriageService,
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
		const version = query.version ?? DEFAULT_TARGET_VERSION;
		await this.syncService.syncIfStale(version);
		return await this.queryService.getLightReport(version);
	}

	/** Re-scans every workflow, updates the finding table, and returns the fresh overview. */
	@Post('/report/refresh')
	@GlobalScope('breakingChanges:list')
	async regenerate(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: BreakingChangeReportQueryDto,
	): Promise<BreakingChangeLightReportResult> {
		const version = query.version ?? DEFAULT_TARGET_VERSION;
		await this.syncService.sync(version);
		return await this.queryService.getLightReport(version);
	}

	/**
	 * The detail of one workflow rule, read from the finding table like the
	 * overview. The same stale check runs first, so a deep link on a fresh
	 * instance is not empty.
	 */
	@Get('/report/:ruleId')
	@GlobalScope('breakingChanges:list')
	async getDetectionReportForRule(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('ruleId') ruleId: string,
	): Promise<BreakingChangeRuleDetailResult> {
		// The page names the rule but not the version, so the rule decides. Only
		// workflow rules have a detail page; an instance rule is rejected before the
		// stale check, which can be a full scan.
		const rule = this.ruleRegistry.getRule(ruleId);
		if (!rule || !isWorkflowLevelRule(rule)) {
			throw new NotFoundError(`Breaking change rule with ID '${ruleId}' not found.`);
		}
		const version = rule.getMetadata().version;
		await this.syncService.syncIfStale(version);
		return await this.queryService.getRuleFindings(version, ruleId);
	}

	/** Sets the status a user picks for the finding of one rule on one workflow. */
	@Patch('/report/:ruleId/workflows/:workflowId')
	@GlobalScope('breakingChanges:migrate')
	async updateFindingStatus(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('ruleId') ruleId: string,
		@Param('workflowId') workflowId: string,
		@Body body: UpdateMigrationFindingStatusRequestDto,
	): Promise<void> {
		await this.triageService.setStatus(ruleId, workflowId, body.status);
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
