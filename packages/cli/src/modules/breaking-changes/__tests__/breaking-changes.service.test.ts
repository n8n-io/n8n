import type { BreakingChangeWorkflowRuleResult } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { WorkflowRepository, WorkflowStatisticsRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { ErrorReporter } from 'n8n-core';

import type { CacheService } from '@/services/cache/cache.service';

import { N8N_VERSION } from '../../../constants';
import { RuleRegistry } from '../breaking-changes.rule-registry.service';
import { BreakingChangeService } from '../breaking-changes.service';
import { createNode, createWorkflow } from './test-helpers';
import { FileAccessRule } from '../rules/v2/file-access.rule';
import { ProcessEnvAccessRule } from '../rules/v2/process-env-access.rule';
import { RemovedNodesRule } from '../rules/v2/removed-nodes.rule';
import { WaitNodeSubworkflowRule } from '../rules/v2/wait-node-subworkflow.rule';

describe('BreakingChangeService', () => {
	const logger = mockLogger();

	let workflowRepository: jest.Mocked<WorkflowRepository>;
	let workflowStatisticsRepository: jest.Mocked<WorkflowStatisticsRepository>;
	let ruleRegistry: RuleRegistry;
	let cacheService: jest.Mocked<CacheService>;
	let service: BreakingChangeService;

	beforeEach(() => {
		jest.clearAllMocks();

		workflowRepository = mock<WorkflowRepository>();
		workflowStatisticsRepository = mock<WorkflowStatisticsRepository>();
		ruleRegistry = new RuleRegistry(logger);
		cacheService = mock<CacheService>();

		// Mock getHashValue to call refreshFn directly (bypass caching for tests)
		cacheService.getHashValue.mockImplementation(async (_key, _hashKey, options) => {
			if (options?.refreshFn) {
				return await options.refreshFn(_key);
			}
			return undefined;
		});

		// Mock statistics repository to return empty array (tests focus on breaking change detection, not statistics)
		workflowStatisticsRepository.find.mockResolvedValue([]);

		// Spy on registerRules to prevent automatic registration in constructor
		jest.spyOn(BreakingChangeService.prototype, 'registerRules').mockImplementation(() => {});

		service = new BreakingChangeService(
			ruleRegistry,
			workflowRepository,
			workflowStatisticsRepository,
			cacheService,
			logger,
			mock<ErrorReporter>(),
		);

		// Manually register only the rules we want to test with
		const removedNodesRule = new RemovedNodesRule();
		const processEnvAccessRule = new ProcessEnvAccessRule();
		const fileAccessRule = new FileAccessRule();

		ruleRegistry.registerAll([removedNodesRule, processEnvAccessRule, fileAccessRule]);
	});

	describe('detect()', () => {
		it('should return a report with no issues when no workflows are affected', async () => {
			workflowRepository.find.mockResolvedValue([]);

			const report = await service.detect('v2');

			expect(report.report).toMatchObject({
				targetVersion: 'v2',
				currentVersion: N8N_VERSION,
				instanceResults: [],
				workflowResults: [],
			});
			expect(report.report.generatedAt).toBeInstanceOf(Date);
		});

		it('should aggregate results from multiple rules', async () => {
			// Create a workflow that triggers all three rules
			const { workflow } = createWorkflow('wf-1', 'Complex Workflow', [
				createNode('Spontit Node', 'n8n-nodes-base.spontit'), // Triggers RemovedNodesRule
				createNode('Code Node', 'n8n-nodes-base.code', {
					code: 'const key = process.env.KEY;', // Triggers ProcessEnvAccessRule
				}),
				createNode('File Node', 'n8n-nodes-base.readWriteFile'), // Triggers FileAccessRule
			]);

			workflowRepository.find.mockResolvedValue([workflow as never]);
			workflowRepository.count.mockResolvedValue(1);

			const report = await service.detect('v2');

			// Verify report structure
			expect(report.report.targetVersion).toBe('v2');
			expect(report.report.currentVersion).toBe(N8N_VERSION);
			expect(report.report.generatedAt).toBeInstanceOf(Date);

			// Verify each rule's result is in the report
			const removedNodesResult = report.report.workflowResults.find(
				(r) => r.ruleId === 'removed-nodes-v2',
			);
			expect(removedNodesResult?.affectedWorkflows).toHaveLength(1);

			const processEnvResult = report.report.workflowResults.find(
				(r) => r.ruleId === 'process-env-access-v2',
			);
			expect(processEnvResult?.affectedWorkflows).toHaveLength(1);

			const fileAccessResult = report.report.workflowResults.find(
				(r) => r.ruleId === 'file-access-restriction-v2',
			);
			expect(fileAccessResult?.affectedWorkflows).toHaveLength(1);
		});

		it('should include all required fields in the report', async () => {
			workflowRepository.find.mockResolvedValue([]);
			workflowRepository.count.mockResolvedValue(0);

			const report = await service.detect('v2');

			expect(report.report).toHaveProperty('generatedAt');
			expect(report.report).toHaveProperty('targetVersion', 'v2');
			expect(report.report).toHaveProperty('currentVersion', N8N_VERSION);
			expect(report.report).toHaveProperty('workflowResults');
			expect(Array.isArray(report.report.workflowResults)).toBe(true);
		});

		it('should aggregate results from batch rules', async () => {
			// Register the batch rule
			const waitNodeRule = new WaitNodeSubworkflowRule();
			ruleRegistry.registerAll([waitNodeRule]);

			// Create a sub-workflow with ExecuteWorkflowTrigger and Wait node
			const { workflow: subWorkflow } = createWorkflow('sub-wf-1', 'Sub Workflow', [
				createNode('Execute Workflow Trigger', 'n8n-nodes-base.executeWorkflowTrigger'),
				createNode('Wait', 'n8n-nodes-base.wait'),
			]);

			// Create a parent workflow that calls the sub-workflow
			const { workflow: parentWorkflow } = createWorkflow('parent-wf-1', 'Parent Workflow', [
				createNode('Execute Workflow', 'n8n-nodes-base.executeWorkflow', {
					source: 'database',
					workflowId: 'sub-wf-1',
				}),
			]);

			workflowRepository.find.mockResolvedValue([subWorkflow, parentWorkflow] as never);
			workflowRepository.count.mockResolvedValue(2);

			const report = await service.detect('v2');

			const waitNodeResult = report.report.workflowResults.find(
				(r) => r.ruleId === 'wait-node-subworkflow-v2',
			);
			expect(waitNodeResult).toBeDefined();
			expect(waitNodeResult?.affectedWorkflows).toHaveLength(1);
			expect(waitNodeResult?.affectedWorkflows[0].id).toBe('parent-wf-1');
		});
	});

	describe('getDetectionResults()', () => {
		it('should protect against concurrent detection operations', async () => {
			workflowRepository.find.mockResolvedValue([]);
			workflowRepository.count.mockResolvedValue(0);

			// Create a spy on the detect method to track how many times it's called
			const detectSpy = jest.spyOn(service, 'detect');

			// Simulate multiple concurrent requests for the same version
			const promise1 = service.getDetectionResults('v2');
			const promise2 = service.getDetectionResults('v2');
			const promise3 = service.getDetectionResults('v2');

			// Wait for all promises to resolve
			const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

			// Verify that detect was only called once (not three times)
			expect(detectSpy).toHaveBeenCalledTimes(1);

			// Verify all three requests received the same result
			expect(result1).toEqual(result2);
			expect(result2).toEqual(result3);
		});

		it('should clean up ongoing detection promise after completion', async () => {
			workflowRepository.find.mockResolvedValue([]);
			workflowRepository.count.mockResolvedValue(0);

			const detectSpy = jest.spyOn(service, 'detect');

			// First detection
			await service.getDetectionResults('v2');
			expect(detectSpy).toHaveBeenCalledTimes(1);

			// Second detection after the first completes should trigger a new detect call
			await service.getDetectionResults('v2');
			expect(detectSpy).toHaveBeenCalledTimes(2);
		});
	});

	describe('getDetectionReportForRule()', () => {
		it('should return undefined for unknown rule ID', async () => {
			const result = await service.getDetectionReportForRule('unknown-rule-id');
			expect(result).toBeUndefined();
		});

		it('should return correct report for a known workflow-level rule', async () => {
			const { workflow } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Spontit Node', 'n8n-nodes-base.spontit'),
			]);

			workflowRepository.find.mockResolvedValue([workflow as never]);
			workflowRepository.count.mockResolvedValue(1);

			const result = (await service.getDetectionReportForRule(
				'removed-nodes-v2',
			)) as BreakingChangeWorkflowRuleResult;
			expect(result).toBeDefined();
			expect(result?.ruleId).toBe('removed-nodes-v2');
			expect(result?.affectedWorkflows).toHaveLength(1);
		});
	});
});
