import {
	AssignMigrationOwnerDto,
	BreakingChangeLightReportResult,
	BreakingChangeReportQueryDto,
	BreakingChangeRuleDetailResult,
	BreakingChangeVersion,
	MigrationNotifyResult,
	MigrationOwnerCandidate,
	MigrationWorkflowOwnerResponse,
	NotifyMigrationOwnersRequestDto,
	UpdateMigrationFindingStatusRequestDto,
	UpdateMigrationFindingStatusesRequestDto,
	WorkflowMigrationResult,
} from '@n8n/api-types';
import { EventService } from '@n8n/backend-services';
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

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import {
	BreakingChangeMigrationService,
	WORKFLOW_NOT_EDITABLE_MESSAGE,
} from './breaking-changes.migration.service';
import { RuleRegistry } from './breaking-changes.rule-registry.service';
import { migrationReportCsvFilename, toMigrationReportCsv } from './migration-report-csv';
import { MigrationFindingNotificationService } from './notifications/migration-finding-notification.service';
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
		private readonly eventService: EventService,
		private readonly ownerAssignmentService: MigrationOwnerAssignmentService,
		private readonly notificationService: MigrationFindingNotificationService,
		private readonly workflowFinderService: WorkflowFinderService,
	) {}

	/**
	 * A user who can edit every workflow reads the whole instance. Everyone else
	 * reads the workflows they can edit, since those are the ones they can fix.
	 */
	private async scopeFor(user: User): Promise<ReportScope> {
		if (hasGlobalScope(user, 'workflow:update')) return { kind: 'instance' };
		const workflowIds = await this.workflowFinderService.findAllWorkflowIdsForUser(user, [
			'workflow:update',
		]);
		return { kind: 'workflows', workflowIds };
	}

	/** The given workflows that the user can edit. Editing a workflow allows triaging its findings. */
	private async editableWorkflowIds(user: User, workflowIds: string[]): Promise<string[]> {
		if (hasGlobalScope(user, 'workflow:update')) return workflowIds;
		const editable = await this.workflowFinderService.findWorkflowIdsWithScopeForUser(
			workflowIds,
			user,
			['workflow:update'],
		);
		return workflowIds.filter((workflowId) => editable.has(workflowId));
	}

	private async assertCanEdit(user: User, workflowId: string): Promise<void> {
		const [editable] = await this.editableWorkflowIds(user, [workflowId]);
		if (!editable) throw new NotFoundError(WORKFLOW_NOT_EDITABLE_MESSAGE);
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
	 * The overview as a CSV download, for an admin who shares the counts with
	 * support from an instance that sends no telemetry. Same scope and stale
	 * check as the overview. Declared before `/report/:ruleId`, which would
	 * otherwise read `export` as a rule id.
	 */
	@Get('/report/export')
	@GlobalScope('breakingChanges:list')
	async exportReport(
		req: AuthenticatedRequest,
		res: Response,
		@Query query: BreakingChangeReportQueryDto,
	): Promise<void> {
		const version = query.version ?? DEFAULT_TARGET_VERSION;
		const scope = await this.scopeFor(req.user);
		await this.syncService.syncIfStale(version);
		const report = await this.queryService.getLightReport(version, scope);
		res.setHeader('Content-Type', 'text/csv; charset=utf-8');
		res.setHeader(
			'Content-Disposition',
			`attachment; filename="${migrationReportCsvFilename(version, new Date())}"`,
		);
		// A cross-origin editor, as in local development, reads the file name only when exposed.
		res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
		res.send(toMigrationReportCsv(report));
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

	/**
	 * Sets the status a user picks for the findings of one rule on many workflows.
	 * Only the workflows that the user can edit change.
	 */
	@Patch('/report/:ruleId/workflows')
	@GlobalScope('breakingChanges:list')
	async updateFindingStatuses(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('ruleId') ruleId: string,
		@Body body: UpdateMigrationFindingStatusesRequestDto,
	): Promise<void> {
		const workflowIds = await this.editableWorkflowIds(req.user, body.workflowIds);
		if (workflowIds.length === 0) return;
		await this.triageService.setStatuses(ruleId, workflowIds, body.status);
	}

	/**
	 * Emails the owners of the given workflows about the rule's finding on them.
	 * A repeated call is a reminder. The response names the workflows that were
	 * notified and the ones that were skipped, with the reason.
	 */
	@Post('/report/:ruleId/workflows/notify')
	@GlobalScope('breakingChanges:migrate')
	async notifyOwners(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('ruleId') ruleId: string,
		@Body body: NotifyMigrationOwnersRequestDto,
	): Promise<MigrationNotifyResult> {
		return await this.notificationService.notifyOwners(ruleId, body.workflowIds, req.user);
	}

	/** Sets the status a user picks for the finding of one rule on one workflow. */
	@Patch('/report/:ruleId/workflows/:workflowId')
	@GlobalScope('breakingChanges:list')
	async updateFindingStatus(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('ruleId') ruleId: string,
		@Param('workflowId') workflowId: string,
		@Body body: UpdateMigrationFindingStatusRequestDto,
	): Promise<void> {
		await this.assertCanEdit(req.user, workflowId);
		await this.triageService.setStatus(ruleId, workflowId, body.status);
	}

	/** The users who can own the workflow's findings. */
	@Get('/workflows/:workflowId/owner/candidates')
	@GlobalScope('breakingChanges:list')
	async listOwnerCandidates(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
	): Promise<MigrationOwnerCandidate[]> {
		await this.assertCanEdit(req.user, workflowId);
		return await this.ownerAssignmentService.candidates(workflowId);
	}

	/** Makes the given user the owner of the workflow's findings. */
	@Put('/workflows/:workflowId/owner')
	@GlobalScope('breakingChanges:list')
	async assignOwner(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
		@Body body: AssignMigrationOwnerDto,
	): Promise<MigrationWorkflowOwnerResponse> {
		await this.assertCanEdit(req.user, workflowId);
		const owner = await this.ownerAssignmentService.assign(workflowId, body.userId, req.user);
		return { owner };
	}

	/** Drops the assigned owner. The response carries the heuristic's suggestion, if any. */
	@Delete('/workflows/:workflowId/owner')
	@GlobalScope('breakingChanges:list')
	async unassignOwner(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
	): Promise<MigrationWorkflowOwnerResponse> {
		await this.assertCanEdit(req.user, workflowId);
		const owner = await this.ownerAssignmentService.unassign(workflowId);
		return { owner };
	}

	/**
	 * Apply the rule's automated migration to a single workflow, saving the
	 * rewritten workflow as a new version. The service checks that the user can
	 * edit the workflow.
	 */
	@Post('/report/:ruleId/workflows/:workflowId/migrate')
	@GlobalScope('breakingChanges:list')
	async migrateWorkflow(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('ruleId') ruleId: string,
		@Param('workflowId') workflowId: string,
	): Promise<WorkflowMigrationResult> {
		return await this.migrationService.migrateWorkflow(ruleId, workflowId, req.user);
	}
}
