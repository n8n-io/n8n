import type {
	BreakingChangeLightReportResult,
	BreakingChangeReportQueryDto,
	BreakingChangeRuleDetailResult,
} from '@n8n/api-types';
import type { EventService } from '@n8n/backend-services';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { ControllerRegistryMetadata, type Controller } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { ForbiddenError, NotFoundError } from '@n8n/errors';
import type { Response } from 'express';
import { mock, type MockProxy } from 'vitest-mock-extended';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { BreakingChangeMigrationService } from '../breaking-changes.migration.service';
import { BreakingChangesController } from '../breaking-changes.controller';
import type { RuleRegistry } from '../breaking-changes.rule-registry.service';
import type { IBreakingChangeRule } from '../types';
import type { MigrationFindingNotificationService } from '../notifications/migration-finding-notification.service';
import type { MigrationOwnerAssignmentService } from '../owners/migration-owner-assignment.service';
import type { MigrationFindingQueryService } from '../query/migration-finding-query.service';
import type { MigrationFindingSyncService } from '../sync/migration-finding-sync.service';
import type { MigrationFindingTriageService } from '../triage/migration-finding-triage.service';

const req = mock<AuthenticatedRequest>({ user: { id: 'user-1' } });
const res = mock<Response>();

/** A user whose global role grants the given scopes. */
function userWithScopes(...scopes: string[]): User {
	return { id: 'user-1', role: { scopes: scopes.map((slug) => ({ slug })) } } as unknown as User;
}
const admin = userWithScopes('breakingChanges:list', 'workflow:update');
const member = userWithScopes('breakingChanges:list');
const INSTANCE = { kind: 'instance' } as const;

function lightReport(generatedAt: Date): BreakingChangeLightReportResult {
	return {
		report: {
			generatedAt,
			targetVersion: 'v2',
			currentVersion: '2.0.0',
			instanceResults: [],
			workflowResults: [],
		},
		totalWorkflows: 3,
		totalAffectedWorkflows: 2,
		shouldCache: false,
	};
}

function ruleResult(ruleId: string): BreakingChangeRuleDetailResult {
	return {
		ruleId,
		ruleTitle: 'Title',
		ruleDescription: 'Description',
		ruleImpact: 'behaviorChanges',
		ruleDocumentationUrl: 'https://docs.n8n.io',
		affectedWorkflows: [],
		recommendations: [],
		migratable: false,
	};
}

describe('BreakingChangesController', () => {
	let migrationService: MockProxy<BreakingChangeMigrationService>;
	let syncService: MockProxy<MigrationFindingSyncService>;
	let queryService: MockProxy<MigrationFindingQueryService>;
	let ruleRegistry: MockProxy<RuleRegistry>;
	let triageService: MockProxy<MigrationFindingTriageService>;
	let eventService: MockProxy<EventService>;
	let ownerAssignmentService: MockProxy<MigrationOwnerAssignmentService>;
	let notificationService: MockProxy<MigrationFindingNotificationService>;
	let workflowFinderService: MockProxy<WorkflowFinderService>;
	let controller: BreakingChangesController;

	beforeEach(() => {
		migrationService = mock<BreakingChangeMigrationService>();
		syncService = mock<MigrationFindingSyncService>();
		queryService = mock<MigrationFindingQueryService>();
		ruleRegistry = mock<RuleRegistry>();
		triageService = mock<MigrationFindingTriageService>();
		req.user = admin;
		eventService = mock<EventService>();
		ownerAssignmentService = mock<MigrationOwnerAssignmentService>();
		notificationService = mock<MigrationFindingNotificationService>();
		workflowFinderService = mock<WorkflowFinderService>();
		workflowFinderService.findAllWorkflowIdsForUser.mockResolvedValue(['wf-1', 'wf-2']);
		workflowFinderService.findWorkflowIdsWithScopeForUser.mockImplementation(
			async (workflowIds) => new Set(workflowIds.filter((id) => ['wf-1', 'wf-2'].includes(id))),
		);
		controller = new BreakingChangesController(
			migrationService,
			syncService,
			queryService,
			ruleRegistry,
			triageService,
			eventService,
			ownerAssignmentService,
			notificationService,
			workflowFinderService,
		);
	});

	describe('workflow owner', () => {
		const owner = {
			id: 'alice',
			firstName: 'Alice',
			lastName: 'A',
			email: 'alice@example.com',
			source: 'assigned' as const,
		};

		it('PUT assigns the user from the body as the acting user and returns the owner', async () => {
			ownerAssignmentService.assign.mockResolvedValue(owner);

			const result = await controller.assignOwner(req, res, 'wf-1', { userId: 'alice' });

			expect(ownerAssignmentService.assign).toHaveBeenCalledWith('wf-1', 'alice', req.user);
			expect(result).toEqual({ owner });
		});

		it('DELETE unassigns and returns what the heuristic suggests instead', async () => {
			ownerAssignmentService.unassign.mockResolvedValue(null);

			const result = await controller.unassignOwner(req, res, 'wf-1');

			expect(ownerAssignmentService.unassign).toHaveBeenCalledWith('wf-1');
			expect(result).toEqual({ owner: null });
		});

		it('rejects a member on a workflow they cannot edit', async () => {
			req.user = member;

			await expect(
				controller.assignOwner(req, res, 'wf-3', { userId: 'alice' }),
			).rejects.toBeInstanceOf(NotFoundError);
			await expect(controller.unassignOwner(req, res, 'wf-3')).rejects.toBeInstanceOf(
				NotFoundError,
			);
			expect(ownerAssignmentService.assign).not.toHaveBeenCalled();
			expect(ownerAssignmentService.unassign).not.toHaveBeenCalled();
		});

		it('GET lists the owner candidates for a member who can edit the workflow', async () => {
			req.user = member;
			ownerAssignmentService.candidates.mockResolvedValue([owner]);

			const result = await controller.listOwnerCandidates(req, res, 'wf-1');

			expect(ownerAssignmentService.candidates).toHaveBeenCalledWith('wf-1');
			expect(result).toEqual([owner]);
		});

		it('GET rejects a member on a workflow they cannot edit', async () => {
			req.user = member;

			const request = controller.listOwnerCandidates(req, res, 'wf-3');
			await expect(request).rejects.toThrow(NotFoundError);
			await expect(request).rejects.toThrow(
				'Workflow not found, or you do not have permission to update it.',
			);
			expect(ownerAssignmentService.candidates).not.toHaveBeenCalled();
		});
	});

	describe('GET /report', () => {
		it('syncs when stale, then returns the query service result unchanged', async () => {
			const expected = lightReport(new Date('2026-01-01T00:00:00Z'));
			const callOrder: string[] = [];
			syncService.syncIfStale.mockImplementation(async () => {
				callOrder.push('syncIfStale');
				return true;
			});
			queryService.getLightReport.mockImplementation(async () => {
				callOrder.push('getLightReport');
				return expected;
			});

			const query: BreakingChangeReportQueryDto = { version: 'v3' };
			const result = await controller.getDetectionReport(req, res, query);

			expect(result).toBe(expected);
			expect(syncService.syncIfStale).toHaveBeenCalledWith('v3');
			expect(queryService.getLightReport).toHaveBeenCalledWith('v3', INSTANCE);
			expect(callOrder).toEqual(['syncIfStale', 'getLightReport']);
			expect(syncService.sync).not.toHaveBeenCalled();
			expect(workflowFinderService.findAllWorkflowIdsForUser).not.toHaveBeenCalled();
		});

		it('scopes the overview to the workflows a user without global edit access can edit', async () => {
			req.user = member;
			queryService.getLightReport.mockResolvedValue(lightReport(new Date()));

			await controller.getDetectionReport(req, res, { version: 'v3' });

			expect(workflowFinderService.findAllWorkflowIdsForUser).toHaveBeenCalledWith(member, [
				'workflow:update',
			]);
			expect(queryService.getLightReport).toHaveBeenCalledWith('v3', {
				kind: 'workflows',
				workflowIds: ['wf-1', 'wf-2'],
			});
		});

		it('announces the served overview for telemetry, as a plain view', async () => {
			const expected = lightReport(new Date('2026-01-01T00:00:00Z'));
			queryService.getLightReport.mockResolvedValue(expected);

			await controller.getDetectionReport(req, res, { version: 'v3' });

			expect(eventService.emit).toHaveBeenCalledWith('migration-report-viewed', {
				user: req.user,
				targetVersion: 'v3',
				refreshed: false,
				report: expected,
			});
		});

		it('defaults the target version to v2', async () => {
			queryService.getLightReport.mockResolvedValue(lightReport(new Date()));

			await controller.getDetectionReport(req, res, {});

			expect(syncService.syncIfStale).toHaveBeenCalledWith('v2');
			expect(queryService.getLightReport).toHaveBeenCalledWith('v2', INSTANCE);
		});
	});

	describe('POST /report/refresh', () => {
		it('rejects a user without global edit access before syncing', async () => {
			req.user = member;

			await expect(controller.regenerate(req, res, { version: 'v3' })).rejects.toBeInstanceOf(
				ForbiddenError,
			);
			expect(syncService.sync).not.toHaveBeenCalled();
			expect(queryService.getLightReport).not.toHaveBeenCalled();
		});

		it('runs a full sync, then returns the fresh overview', async () => {
			const expected = lightReport(new Date('2026-02-01T00:00:00Z'));
			const callOrder: string[] = [];
			syncService.sync.mockImplementation(async () => {
				callOrder.push('sync');
				return true;
			});
			queryService.getLightReport.mockImplementation(async () => {
				callOrder.push('getLightReport');
				return expected;
			});

			const result = await controller.regenerate(req, res, { version: 'v3' });

			expect(result).toBe(expected);
			expect(syncService.sync).toHaveBeenCalledWith('v3');
			expect(queryService.getLightReport).toHaveBeenCalledWith('v3', INSTANCE);
			expect(callOrder).toEqual(['sync', 'getLightReport']);
			expect(syncService.syncIfStale).not.toHaveBeenCalled();
		});

		it('announces the served overview for telemetry, as a refresh', async () => {
			const expected = lightReport(new Date('2026-02-01T00:00:00Z'));
			queryService.getLightReport.mockResolvedValue(expected);

			await controller.regenerate(req, res, { version: 'v3' });

			expect(eventService.emit).toHaveBeenCalledWith('migration-report-viewed', {
				user: req.user,
				targetVersion: 'v3',
				refreshed: true,
				report: expected,
			});
		});

		it('defaults the target version to v2', async () => {
			queryService.getLightReport.mockResolvedValue(lightReport(new Date()));

			await controller.regenerate(req, res, {});

			expect(syncService.sync).toHaveBeenCalledWith('v2');
			expect(queryService.getLightReport).toHaveBeenCalledWith('v2', INSTANCE);
		});
	});

	describe('GET /report/export', () => {
		beforeEach(() => {
			vi.useFakeTimers({ now: new Date('2026-10-20T10:00:00.000Z'), toFake: ['Date'] });
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('syncs when stale, then sends the overview as a CSV attachment', async () => {
			const callOrder: string[] = [];
			syncService.syncIfStale.mockImplementation(async () => {
				callOrder.push('syncIfStale');
				return true;
			});
			queryService.getLightReport.mockImplementation(async () => {
				callOrder.push('getLightReport');
				return lightReport(new Date('2026-01-01T00:00:00Z'));
			});

			await controller.exportReport(req, res, { version: 'v3' });

			expect(syncService.syncIfStale).toHaveBeenCalledWith('v3');
			expect(queryService.getLightReport).toHaveBeenCalledWith('v3', INSTANCE);
			expect(callOrder).toEqual(['syncIfStale', 'getLightReport']);
			expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
			expect(res.setHeader).toHaveBeenCalledWith(
				'Content-Disposition',
				'attachment; filename="migration-report-v3-2026-10-20.csv"',
			);
			// A cross-origin editor, as in local development, reads the file name only when exposed.
			expect(res.setHeader).toHaveBeenCalledWith(
				'Access-Control-Expose-Headers',
				'Content-Disposition',
			);
			expect(res.send).toHaveBeenCalledTimes(1);
			const [body] = res.send.mock.calls[0];
			expect(body).toMatch(/^target_version,current_version,synced_at,/);
			expect(body).toContain('v2,2.0.0,2026-01-01T00:00:00.000Z,3,2,0');
		});

		it('does not count as a view for telemetry', async () => {
			queryService.getLightReport.mockResolvedValue(lightReport(new Date()));

			await controller.exportReport(req, res, { version: 'v3' });

			expect(eventService.emit).not.toHaveBeenCalled();
		});

		it('scopes the file to the workflows a user without global edit access can edit', async () => {
			req.user = member;
			queryService.getLightReport.mockResolvedValue(lightReport(new Date()));

			await controller.exportReport(req, res, { version: 'v3' });

			expect(queryService.getLightReport).toHaveBeenCalledWith('v3', {
				kind: 'workflows',
				workflowIds: ['wf-1', 'wf-2'],
			});
		});

		it('defaults the target version to v2', async () => {
			queryService.getLightReport.mockResolvedValue(lightReport(new Date()));

			await controller.exportReport(req, res, {});

			expect(syncService.syncIfStale).toHaveBeenCalledWith('v2');
			expect(queryService.getLightReport).toHaveBeenCalledWith('v2', INSTANCE);
			expect(res.setHeader).toHaveBeenCalledWith(
				'Content-Disposition',
				'attachment; filename="migration-report-v2-2026-10-20.csv"',
			);
		});
	});

	describe('GET /report/:ruleId', () => {
		// Plain objects, not proxies: the controller tells rule kinds apart by their methods.
		function registerRule(ruleId: string, version: 'v2' | 'v3', kind: 'workflow' | 'instance') {
			const getMetadata = () => ({ version }) as ReturnType<IBreakingChangeRule['getMetadata']>;
			const rule =
				kind === 'workflow'
					? { id: ruleId, getMetadata, detectWorkflow: vi.fn() }
					: { id: ruleId, getMetadata, detect: vi.fn() };
			ruleRegistry.getRule
				.calledWith(ruleId)
				.mockReturnValue(rule as unknown as IBreakingChangeRule);
		}

		it("syncs the rule's version when stale, then returns the query service result unchanged", async () => {
			registerRule('removed-nodes-v3', 'v3', 'workflow');
			const expected = ruleResult('removed-nodes-v3');
			const callOrder: string[] = [];
			syncService.syncIfStale.mockImplementation(async () => {
				callOrder.push('syncIfStale');
				return true;
			});
			queryService.getRuleFindings.mockImplementation(async () => {
				callOrder.push('getRuleFindings');
				return expected;
			});

			const result = await controller.getDetectionReportForRule(req, res, 'removed-nodes-v3');

			expect(result).toBe(expected);
			expect(syncService.syncIfStale).toHaveBeenCalledWith('v3');
			expect(queryService.getRuleFindings).toHaveBeenCalledWith('v3', 'removed-nodes-v3', INSTANCE);
			expect(callOrder).toEqual(['syncIfStale', 'getRuleFindings']);
			expect(syncService.sync).not.toHaveBeenCalled();
		});

		it('scopes the detail to the workflows a user without global edit access can edit', async () => {
			req.user = member;
			registerRule('removed-nodes-v3', 'v3', 'workflow');
			queryService.getRuleFindings.mockResolvedValue(ruleResult('removed-nodes-v3'));

			await controller.getDetectionReportForRule(req, res, 'removed-nodes-v3');

			expect(queryService.getRuleFindings).toHaveBeenCalledWith('v3', 'removed-nodes-v3', {
				kind: 'workflows',
				workflowIds: ['wf-1', 'wf-2'],
			});
		});

		it('uses v2 for a v2 rule', async () => {
			registerRule('removed-nodes-v2', 'v2', 'workflow');
			queryService.getRuleFindings.mockResolvedValue(ruleResult('removed-nodes-v2'));

			await controller.getDetectionReportForRule(req, res, 'removed-nodes-v2');

			expect(syncService.syncIfStale).toHaveBeenCalledWith('v2');
			expect(queryService.getRuleFindings).toHaveBeenCalledWith('v2', 'removed-nodes-v2', INSTANCE);
		});

		it('rejects an instance rule with not-found before syncing or reading', async () => {
			registerRule('docker-only-deployment-v3', 'v3', 'instance');

			await expect(
				controller.getDetectionReportForRule(req, res, 'docker-only-deployment-v3'),
			).rejects.toBeInstanceOf(NotFoundError);
			expect(syncService.syncIfStale).not.toHaveBeenCalled();
			expect(queryService.getRuleFindings).not.toHaveBeenCalled();
		});

		it('rejects an unknown rule with not-found before syncing or reading', async () => {
			ruleRegistry.getRule.mockReturnValue(undefined);

			await expect(
				controller.getDetectionReportForRule(req, res, 'unknown'),
			).rejects.toBeInstanceOf(NotFoundError);
			expect(syncService.syncIfStale).not.toHaveBeenCalled();
			expect(queryService.getRuleFindings).not.toHaveBeenCalled();
		});
	});

	describe('PATCH /report/:ruleId/workflows', () => {
		it('passes the rule, workflows and status to the triage service and returns nothing', async () => {
			triageService.setStatuses.mockResolvedValue(undefined);

			const result = await controller.updateFindingStatuses(req, res, 'removed-nodes-v3', {
				workflowIds: ['wf-1', 'wf-2'],
				status: 'wont_fix',
			});

			expect(result).toBeUndefined();
			expect(triageService.setStatuses).toHaveBeenCalledWith(
				'removed-nodes-v3',
				['wf-1', 'wf-2'],
				'wont_fix',
			);
			expect(syncService.syncIfStale).not.toHaveBeenCalled();
			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).not.toHaveBeenCalled();
		});

		it('changes only the workflows that a member can edit', async () => {
			req.user = member;

			await controller.updateFindingStatuses(req, res, 'removed-nodes-v3', {
				workflowIds: ['wf-1', 'wf-3'],
				status: 'wont_fix',
			});

			expect(triageService.setStatuses).toHaveBeenCalledWith(
				'removed-nodes-v3',
				['wf-1'],
				'wont_fix',
			);
			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).toHaveBeenCalledWith(
				['wf-1', 'wf-3'],
				member,
				['workflow:update'],
			);
		});

		it('changes nothing when a member can edit none of the workflows', async () => {
			req.user = member;

			await controller.updateFindingStatuses(req, res, 'removed-nodes-v3', {
				workflowIds: ['wf-3'],
				status: 'wont_fix',
			});

			expect(triageService.setStatuses).not.toHaveBeenCalled();
		});
	});

	describe('POST /report/:ruleId/workflows/notify', () => {
		it('passes the rule, workflows and acting user to the notification service and returns its result', async () => {
			const expected = { notifiedWorkflowIds: ['wf-1'], skipped: [] };
			notificationService.notifyOwners.mockResolvedValue(expected);

			const result = await controller.notifyOwners(req, res, 'removed-nodes-v3', {
				workflowIds: ['wf-1', 'wf-2'],
			});

			expect(result).toBe(expected);
			expect(notificationService.notifyOwners).toHaveBeenCalledWith(
				'removed-nodes-v3',
				['wf-1', 'wf-2'],
				req.user,
			);
		});

		it('requires the global breakingChanges:migrate scope', () => {
			const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
				BreakingChangesController as Controller,
			);

			expect(metadata.routes.get('notifyOwners')?.accessScope).toEqual({
				scope: 'breakingChanges:migrate',
				globalOnly: true,
			});
		});
	});

	describe('PATCH /report/:ruleId/workflows/:workflowId', () => {
		it('passes the rule, workflow and status to the triage service and returns nothing', async () => {
			triageService.setStatus.mockResolvedValue(undefined);

			const result = await controller.updateFindingStatus(req, res, 'removed-nodes-v3', 'wf-1', {
				status: 'wont_fix',
			});

			expect(result).toBeUndefined();
			expect(triageService.setStatus).toHaveBeenCalledWith('removed-nodes-v3', 'wf-1', 'wont_fix');
			expect(syncService.syncIfStale).not.toHaveBeenCalled();
		});

		it('passes on a not-found error from the triage service', async () => {
			triageService.setStatus.mockRejectedValue(new NotFoundError('Finding not found.'));

			await expect(
				controller.updateFindingStatus(req, res, 'removed-nodes-v3', 'wf-1', { status: 'open' }),
			).rejects.toBeInstanceOf(NotFoundError);
		});

		it('lets a member change a workflow they can edit', async () => {
			req.user = member;

			await controller.updateFindingStatus(req, res, 'removed-nodes-v3', 'wf-2', {
				status: 'wont_fix',
			});

			expect(triageService.setStatus).toHaveBeenCalledWith('removed-nodes-v3', 'wf-2', 'wont_fix');
		});

		it('rejects a member on a workflow they cannot edit', async () => {
			req.user = member;

			await expect(
				controller.updateFindingStatus(req, res, 'removed-nodes-v3', 'wf-3', { status: 'open' }),
			).rejects.toBeInstanceOf(NotFoundError);
			expect(triageService.setStatus).not.toHaveBeenCalled();
		});
	});

	// Editing a workflow allows triaging its findings, so these routes check workflow
	// access in the handler. A notification emails other users and stays with admins.
	it.each([
		'updateFindingStatuses',
		'updateFindingStatus',
		'assignOwner',
		'unassignOwner',
		'listOwnerCandidates',
		'migrateWorkflow',
	])('%s requires only the global breakingChanges:list scope', (route) => {
		const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
			BreakingChangesController as Controller,
		);

		expect(metadata.routes.get(route)?.accessScope).toEqual({
			scope: 'breakingChanges:list',
			globalOnly: true,
		});
	});
});
