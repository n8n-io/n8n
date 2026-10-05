import type {
	BreakingChangeLightReportResult,
	BreakingChangeReportQueryDto,
	BreakingChangeWorkflowRuleResult,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
import type { Response } from 'express';
import { mock, type MockProxy } from 'vitest-mock-extended';

import type { BreakingChangeMigrationService } from '../breaking-changes.migration.service';
import { BreakingChangesController } from '../breaking-changes.controller';
import type { RuleRegistry } from '../breaking-changes.rule-registry.service';
import type { IBreakingChangeRule } from '../types';
import type { MigrationFindingQueryService } from '../query/migration-finding-query.service';
import type { MigrationFindingSyncService } from '../sync/migration-finding-sync.service';

const req = mock<AuthenticatedRequest>();
const res = mock<Response>();

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

function ruleResult(ruleId: string): BreakingChangeWorkflowRuleResult {
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
	let controller: BreakingChangesController;

	beforeEach(() => {
		migrationService = mock<BreakingChangeMigrationService>();
		syncService = mock<MigrationFindingSyncService>();
		queryService = mock<MigrationFindingQueryService>();
		ruleRegistry = mock<RuleRegistry>();
		controller = new BreakingChangesController(
			migrationService,
			syncService,
			queryService,
			ruleRegistry,
		);
	});

	describe('GET /report', () => {
		it('syncs when stale, then returns the query service result unchanged', async () => {
			const expected = lightReport(new Date('2026-01-01T00:00:00Z'));
			const callOrder: string[] = [];
			syncService.syncIfStale.mockImplementation(async () => {
				callOrder.push('syncIfStale');
			});
			queryService.getLightReport.mockImplementation(async () => {
				callOrder.push('getLightReport');
				return expected;
			});

			const query: BreakingChangeReportQueryDto = { version: 'v3' };
			const result = await controller.getDetectionReport(req, res, query);

			expect(result).toBe(expected);
			expect(syncService.syncIfStale).toHaveBeenCalledWith('v3');
			expect(queryService.getLightReport).toHaveBeenCalledWith('v3');
			expect(callOrder).toEqual(['syncIfStale', 'getLightReport']);
			expect(syncService.sync).not.toHaveBeenCalled();
		});

		it('defaults the target version to v2', async () => {
			queryService.getLightReport.mockResolvedValue(lightReport(new Date()));

			await controller.getDetectionReport(req, res, {});

			expect(syncService.syncIfStale).toHaveBeenCalledWith('v2');
			expect(queryService.getLightReport).toHaveBeenCalledWith('v2');
		});
	});

	describe('POST /report/refresh', () => {
		it('runs a full sync, then returns the fresh overview', async () => {
			const expected = lightReport(new Date('2026-02-01T00:00:00Z'));
			const callOrder: string[] = [];
			syncService.sync.mockImplementation(async () => {
				callOrder.push('sync');
			});
			queryService.getLightReport.mockImplementation(async () => {
				callOrder.push('getLightReport');
				return expected;
			});

			const result = await controller.regenerate(req, res, { version: 'v3' });

			expect(result).toBe(expected);
			expect(syncService.sync).toHaveBeenCalledWith('v3');
			expect(queryService.getLightReport).toHaveBeenCalledWith('v3');
			expect(callOrder).toEqual(['sync', 'getLightReport']);
			expect(syncService.syncIfStale).not.toHaveBeenCalled();
		});

		it('defaults the target version to v2', async () => {
			queryService.getLightReport.mockResolvedValue(lightReport(new Date()));

			await controller.regenerate(req, res, {});

			expect(syncService.sync).toHaveBeenCalledWith('v2');
			expect(queryService.getLightReport).toHaveBeenCalledWith('v2');
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
			});
			queryService.getRuleFindings.mockImplementation(async () => {
				callOrder.push('getRuleFindings');
				return expected;
			});

			const result = await controller.getDetectionReportForRule(req, res, 'removed-nodes-v3');

			expect(result).toBe(expected);
			expect(syncService.syncIfStale).toHaveBeenCalledWith('v3');
			expect(queryService.getRuleFindings).toHaveBeenCalledWith('v3', 'removed-nodes-v3');
			expect(callOrder).toEqual(['syncIfStale', 'getRuleFindings']);
			expect(syncService.sync).not.toHaveBeenCalled();
		});

		it('uses v2 for a v2 rule', async () => {
			registerRule('removed-nodes-v2', 'v2', 'workflow');
			queryService.getRuleFindings.mockResolvedValue(ruleResult('removed-nodes-v2'));

			await controller.getDetectionReportForRule(req, res, 'removed-nodes-v2');

			expect(syncService.syncIfStale).toHaveBeenCalledWith('v2');
			expect(queryService.getRuleFindings).toHaveBeenCalledWith('v2', 'removed-nodes-v2');
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
});
