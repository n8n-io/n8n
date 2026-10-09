import {
	AssignMigrationOwnerDto,
	BreakingChangeLightReportResult,
	BreakingChangeReportQueryDto,
	BreakingChangeRuleDetailResult,
	BreakingChangeVersion,
	MigrationWorkflowOwnerResponse,
	UpdateMigrationFindingStatusRequestDto,
	WorkflowMigrationResult,
} from '@n8n/api-types';
import { EventService, WorkflowSharingService } from '@n8n/backend-services';
import { AuthenticatedRequest, type User } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	GlobalScope,
	Param,
	Patch,
	Post,
	Put,
	Query,
	RestController,
} from '@n8n/decorators';
import { ForbiddenError, NotFoundError } from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';
import { Response } from 'express';

import { BreakingChangeMigrationService } from './breaking-changes.migration.service';
import { RuleRegistry } from './breaking-changes.rule-registry.service';
import { MigrationOwnerAssignmentService } from './owners/migration-owner-assignment.service';
import {
	MigrationFindingQueryService,
	type ReportScope,
} from './query/migration-finding-query.service';
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
		private readonly workflowSharingService: WorkflowSharingService,
		private readonly eventService: EventService,
		private readonly ownerAssignmentService: MigrationOwnerAssignmentService,
	) {}

	/**
	 * A user who can edit every workflow reads the whole instance. Everyone else
	 * reads the workflows they can edit, since those are the ones they can fix.
	 */
	private async scopeFor(user: User): Promise<ReportScope> {
		if (hasGlobalScope(user, 'workflow:update')) return { kind: 'instance' };
		const workflowIds = await this.workflowSharingService.getSharedWorkflowIdsForScopes(user, [
			'workflow:update',
		]);
		// A workflow shared into two of the user's projects comes back twice.
		return { kind: 'workflows', workflowIds: [...new Set(workflowIds)] };
	}

	/**
	 * The report overview, read from the finding table. A first read, or a
	 * changed rule set, fills the table before the read.
	 */
	@Get('/report')
	@GlobalScope('breakingChanges:list')
	async getDetectionReport(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: BreakingChangeReportQueryDto,
	): Promise<BreakingChangeLightReportResult> {
		const version = query.version ?? DEFAULT_TARGET_VERSION;
		const scope = await this.scopeFor(req.user);
		await this.syncService.syncIfStale(version);
		const report = await this.queryService.getLightReport(version, scope);
		this.eventService.emit('migration-report-viewed', {
			user: req.user,
			targetVersion: version,
			refreshed: false,
			report,
		});
		return report;
	}

	/** Re-scans every workflow, updates the finding table, and returns the fresh overview. */
	@Post('/report/refresh')
	@GlobalScope('breakingChanges:list')
	async regenerate(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: BreakingChangeReportQueryDto,
	): Promise<BreakingChangeLightReportResult> {
		const version = query.version ?? DEFAULT_TARGET_VERSION;
		// A full scan is an instance-wide operation, so a scoped reader may not start one.
		const scope = await this.scopeFor(req.user);
		if (scope.kind !== 'instance') {
			throw new ForbiddenError('Only a user who can edit every workflow can refresh the report');
		}
		await this.syncService.sync(version);
		const report = await this.queryService.getLightReport(version, scope);
		this.eventService.emit('migration-report-viewed', {
			user: req.user,
			targetVersion: version,
			refreshed: true,
			report,
		});
		return report;
	}

	/**
	 * The detail of one workflow rule, read from the finding table like the
	 * overview. The same stale check runs first, so a deep link on a fresh
	 * instance is not empty.
	 */
	@Get('/report/:ruleId')
	@GlobalScope('breakingChanges:list')
	async getDetectionReportForRule(
		req: AuthenticatedRequest,
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
		const scope = await this.scopeFor(req.user);
		await this.syncService.syncIfStale(version);
		return await this.queryService.getRuleFindings(version, ruleId, scope);
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

	/** Makes the given user the owner of the workflow's findings. */
	@Put('/workflows/:workflowId/owner')
	@GlobalScope('breakingChanges:migrate')
	async assignOwner(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
		@Body body: AssignMigrationOwnerDto,
	): Promise<MigrationWorkflowOwnerResponse> {
		const owner = await this.ownerAssignmentService.assign(workflowId, body.userId, req.user);
		return { owner };
	}

	/** Drops the assigned owner. The response carries the heuristic's suggestion, if any. */
	@Delete('/workflows/:workflowId/owner')
	@GlobalScope('breakingChanges:migrate')
	async unassignOwner(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
	): Promise<MigrationWorkflowOwnerResponse> {
		const owner = await this.ownerAssignmentService.unassign(workflowId);
		return { owner };
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
