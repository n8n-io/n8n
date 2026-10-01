import type {
	BreakingChangeAffectedWorkflow,
	BreakingChangeReportResult,
	BreakingChangeWorkflowRuleResult,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { BreakingChangesController } from '../breaking-changes.controller';
import type { BreakingChangeMigrationService } from '../breaking-changes.migration.service';
import type { BreakingChangeService } from '../breaking-changes.service';

vi.mock('../breaking-changes.service', () => ({ BreakingChangeService: vi.fn() }));
vi.mock('../breaking-changes.migration.service', () => ({
	BreakingChangeMigrationService: vi.fn(),
}));

const affectedWorkflow = (id: string): BreakingChangeAffectedWorkflow => ({
	id,
	name: `Workflow ${id}`,
	active: true,
	numberOfExecutions: 0,
	lastUpdatedAt: new Date('2024-01-01'),
	issues: [],
});

const workflowRule = (ruleId: string, workflowIds: string[]): BreakingChangeWorkflowRuleResult => ({
	ruleId,
	ruleTitle: ruleId,
	ruleDescription: ruleId,
	ruleImpact: 'executionsFail',
	recommendations: [],
	migratable: false,
	affectedWorkflows: workflowIds.map(affectedWorkflow),
});

describe('BreakingChangesController', () => {
	const service = mock<BreakingChangeService>();
	const controller = new BreakingChangesController(service, mock<BreakingChangeMigrationService>());

	const detectionResult: BreakingChangeReportResult = {
		report: {
			generatedAt: new Date('2024-01-01'),
			targetVersion: 'v3',
			currentVersion: '2.0.0',
			instanceResults: [],
			workflowResults: [
				workflowRule('rule-1', ['wf-1', 'wf-2']),
				workflowRule('rule-2', ['wf-1', 'wf-3']),
				workflowRule('rule-3', ['wf-1']),
			],
		},
		totalWorkflows: 10,
		shouldCache: true,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should count each affected workflow once when it breaks several rules', async () => {
		service.getDetectionResults.mockResolvedValue(detectionResult);

		const result = await controller.getDetectionReport(
			mock<AuthenticatedRequest>(),
			mock<Response>(),
			{},
		);

		expect(result.totalWorkflows).toBe(10);
		expect(result.totalAffectedWorkflows).toBe(3);
		expect(result.report.workflowResults.map((r) => r.nbAffectedWorkflows)).toEqual([2, 2, 1]);
		expect(result.report.workflowResults[0]).not.toHaveProperty('affectedWorkflows');
	});

	it('should return the distinct affected count after a refresh', async () => {
		service.refreshDetectionResults.mockResolvedValue(detectionResult);

		const result = await controller.refreshCache(
			mock<AuthenticatedRequest>(),
			mock<Response>(),
			{},
		);

		expect(result.totalAffectedWorkflows).toBe(3);
	});
});
