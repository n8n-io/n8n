import type { BreakingChangeWorkflowRuleResult } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { WorkflowRepository, WorkflowStatisticsRepository } from '@n8n/db';
import type { ErrorReporter } from 'n8n-core';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CacheService } from '@n8n/backend-services';

import { N8N_VERSION } from '../../../constants';
import { MigrationRegistry } from '../breaking-changes.migration-registry.service';
import { RuleRegistry } from '../breaking-changes.rule-registry.service';
import type { IBreakingChangeRule } from '../types';
import { BreakingChangeService } from '../breaking-changes.service';
import { createNode, createWorkflow } from './test-helpers';
import { FileAccessRule } from '../rules/v2/file-access.rule';
import { ProcessEnvAccessRule } from '../rules/v2/process-env-access.rule';
import { RemovedNodesRule } from '../rules/v2/removed-nodes.rule';
import { WaitNodeSubworkflowRule } from '../rules/v2/wait-node-subworkflow.rule';

describe('BreakingChangeService', () => {
	const logger = mockLogger();

	let workflowRepository: Mocked<WorkflowRepository>;
	let workflowStatisticsRepository: Mocked<WorkflowStatisticsRepository>;
	let ruleRegistry: RuleRegistry;
	let cacheService: Mocked<CacheService>;
	let errorReporter: Mocked<ErrorReporter>;
	let service: BreakingChangeService;

	beforeEach(() => {
		vi.clearAllMocks();

		workflowRepository = mock<WorkflowRepository>();
		workflowStatisticsRepository = mock<WorkflowStatisticsRepository>();
		ruleRegistry = new RuleRegistry(logger);
		cacheService = mock<CacheService>();
		errorReporter = mock<ErrorReporter>();

		// Mock getHashValue to call refreshFn directly (bypass caching for tests)
		cacheService.getHashValue.mockImplementation(async (_key, _hashKey, options) => {
			if (options?.refreshFn) {
				return await options.refreshFn(_key);
			}
			return undefined;
		});

		// Mock statistics repository to return empty array (tests focus on breaking change detection, not statistics)
		workflowStatisticsRepository.find.mockResolvedValue([]);

		service = new BreakingChangeService(
			ruleRegistry,
			new MigrationRegistry(logger),
			workflowRepository,
			workflowStatisticsRepository,
			cacheService,
			logger,
			errorReporter,
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
			const detectSpy = vi.spyOn(service, 'detect');

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

		it('should share one scan between a report request and a direct detect call', async () => {
			workflowRepository.find.mockResolvedValue([]);
			workflowRepository.count.mockResolvedValue(0);

			// `count` runs once per scan, so it tells how many scans really ran.
			await Promise.all([service.getDetectionResults('v2'), service.detect('v2')]);

			expect(workflowRepository.count).toHaveBeenCalledTimes(1);
		});

		it('should skip a rule that throws for a workflow and keep the other results', async () => {
			const { workflow } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Spontit Node', 'n8n-nodes-base.spontit'),
			]);
			workflowRepository.find.mockResolvedValue([workflow as never]);
			workflowRepository.count.mockResolvedValue(1);

			const throwingRule = ruleRegistry.getRule('file-access-restriction-v2') as FileAccessRule;
			vi.spyOn(throwingRule, 'detectWorkflow').mockRejectedValue(new Error('boom'));

			const result = await service.getDetectionResults('v2');

			const ruleIds = result.report.workflowResults.map((r) => r.ruleId);
			expect(ruleIds).toContain('removed-nodes-v2');
			expect(ruleIds).not.toContain(throwingRule.id);
			expect(errorReporter.error).toHaveBeenCalledWith(
				expect.any(Error),
				expect.objectContaining({ extra: { ruleId: throwingRule.id, workflowId: 'wf-1' } }),
			);
		});

		it('should list the rule checks that threw and keep them out of the report result', async () => {
			const { workflow } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Spontit Node', 'n8n-nodes-base.spontit'),
			]);
			workflowRepository.find.mockResolvedValue([workflow as never]);
			workflowRepository.count.mockResolvedValue(1);

			const throwingRule = ruleRegistry.getRule('file-access-restriction-v2') as FileAccessRule;
			vi.spyOn(throwingRule, 'detectWorkflow').mockRejectedValue(new Error('boom'));

			const scan = await service.detect('v2');
			expect(scan.failedChecks).toEqual([{ ruleId: throwingRule.id, workflowId: 'wf-1' }]);

			const result = await service.getDetectionResults('v2');
			expect(result).not.toHaveProperty('failedChecks');
		});

		it('should reject when detection fails and allow a later detection to run', async () => {
			workflowRepository.count.mockRejectedValueOnce(new Error('db down'));
			workflowRepository.count.mockResolvedValue(0);
			workflowRepository.find.mockResolvedValue([]);

			await expect(service.getDetectionResults('v2')).rejects.toThrow('db down');

			const detectSpy = vi.spyOn(service, 'detect');
			await expect(service.getDetectionResults('v2')).resolves.toBeDefined();
			expect(detectSpy).toHaveBeenCalledTimes(1);
		});

		it('should key the cache on the n8n version and the target version', async () => {
			workflowRepository.find.mockResolvedValue([]);
			workflowRepository.count.mockResolvedValue(0);

			await service.getDetectionResults('v2');

			expect(cacheService.get).toHaveBeenCalledWith(`breaking-changes:results:${N8N_VERSION}:v2`);
		});

		it('should clean up ongoing detection promise after completion', async () => {
			workflowRepository.find.mockResolvedValue([]);
			workflowRepository.count.mockResolvedValue(0);

			const detectSpy = vi.spyOn(service, 'detect');

			// First detection
			await service.getDetectionResults('v2');
			expect(detectSpy).toHaveBeenCalledTimes(1);

			// Second detection after the first completes should trigger a new detect call
			await service.getDetectionResults('v2');
			expect(detectSpy).toHaveBeenCalledTimes(2);
		});
	});

	describe('detectRule()', () => {
		const subWorkflowNodes = [
			createNode('Execute Workflow Trigger', 'n8n-nodes-base.executeWorkflowTrigger'),
			createNode('Wait', 'n8n-nodes-base.wait'),
		];
		const parentWorkflowNodes = [
			createNode('Execute Workflow', 'n8n-nodes-base.executeWorkflow', {
				source: 'database',
				workflowId: 'sub-wf-1',
			}),
		];
		let waitNodeRule: WaitNodeSubworkflowRule;

		beforeEach(() => {
			waitNodeRule = new WaitNodeSubworkflowRule();
			ruleRegistry.registerAll([waitNodeRule]);

			const { workflow: subWorkflow } = createWorkflow(
				'sub-wf-1',
				'Sub Workflow',
				subWorkflowNodes,
			);
			const { workflow: parentWorkflow } = createWorkflow(
				'parent-wf-1',
				'Parent Workflow',
				parentWorkflowNodes,
			);
			workflowRepository.find.mockResolvedValue([subWorkflow, parentWorkflow] as never);
			workflowRepository.count.mockResolvedValue(2);
		});

		it('should run only the requested batch rule and return its result', async () => {
			const otherRuleSpies = ruleRegistry
				.getRules('v2')
				.filter((rule): rule is RemovedNodesRule => 'detectWorkflow' in rule)
				.map((rule) => vi.spyOn(rule, 'detectWorkflow'));

			const result = await service.detectRule('v2', waitNodeRule);

			expect(result?.ruleId).toBe('wait-node-subworkflow-v2');
			expect(result?.affectedWorkflows.map((workflow) => workflow.id)).toEqual(['parent-wf-1']);
			for (const spy of otherRuleSpies) expect(spy).not.toHaveBeenCalled();
		});

		it('should run only the requested workflow rule and return its result', async () => {
			const collectSpy = vi.spyOn(waitNodeRule, 'collectWorkflowData');
			const { workflow } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Spontit Node', 'n8n-nodes-base.spontit'),
			]);
			workflowRepository.find.mockResolvedValue([workflow as never]);
			workflowRepository.count.mockResolvedValue(1);
			const removedNodesRule = ruleRegistry.getRule('removed-nodes-v2') as RemovedNodesRule;

			const result = await service.detectRule('v2', removedNodesRule);

			expect(result?.ruleId).toBe('removed-nodes-v2');
			expect(result?.affectedWorkflows).toHaveLength(1);
			expect(collectSpy).not.toHaveBeenCalled();
		});

		it('should return undefined when the rule affects no workflow', async () => {
			workflowRepository.find.mockResolvedValue([]);
			workflowRepository.count.mockResolvedValue(0);

			await expect(service.detectRule('v2', waitNodeRule)).resolves.toBeUndefined();
		});

		it('should take the result from a full scan that is in flight instead of scanning again', async () => {
			let releaseCount: (total: number) => void = () => {};
			workflowRepository.count.mockReturnValueOnce(
				new Promise<number>((resolve) => {
					releaseCount = resolve;
				}),
			);

			const fullScan = service.detect('v2');
			const ruleScan = service.detectRule('v2', waitNodeRule);
			releaseCount(2);
			const [full, single] = await Promise.all([fullScan, ruleScan]);

			// `count` runs once per scan, so it tells how many scans really ran.
			expect(workflowRepository.count).toHaveBeenCalledTimes(1);
			expect(single).toBe(
				full.report.workflowResults.find((entry) => entry.ruleId === 'wait-node-subworkflow-v2'),
			);
		});

		it('should make a full scan requested during a single-rule scan wait for it', async () => {
			const steps: string[] = [];
			vi.spyOn(waitNodeRule, 'reset').mockImplementation(() => steps.push('reset'));
			const produceReport = waitNodeRule.produceReport.bind(waitNodeRule);
			vi.spyOn(waitNodeRule, 'produceReport').mockImplementation(async () => {
				steps.push('produceReport');
				return await produceReport();
			});
			let releaseCount: (total: number) => void = () => {};
			workflowRepository.count.mockReturnValueOnce(
				new Promise<number>((resolve) => {
					releaseCount = resolve;
				}),
			);

			const ruleScan = service.detectRule('v2', waitNodeRule);
			const fullScan = service.detect('v2');
			releaseCount(2);
			const [single, full] = await Promise.all([ruleScan, fullScan]);

			expect(workflowRepository.count).toHaveBeenCalledTimes(2);
			// The batch rule state of one scan is never reset by the other.
			expect(steps).toEqual(['reset', 'produceReport', 'reset', 'produceReport']);
			expect(single?.affectedWorkflows.map((workflow) => workflow.id)).toEqual(['parent-wf-1']);
			expect(
				full.report.workflowResults.find((entry) => entry.ruleId === 'wait-node-subworkflow-v2')
					?.affectedWorkflows,
			).toHaveLength(1);
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

	describe('detectWorkflowHits()', () => {
		const v2Metadata = () => ({ version: 'v2' }) as ReturnType<IBreakingChangeRule['getMetadata']>;

		it('runs only the workflow-level rules and returns the hits of the rules that fire', async () => {
			const batchRule = {
				id: 'batch-v2',
				getMetadata: v2Metadata,
				collectWorkflowData: vi.fn(),
				produceReport: vi.fn(),
				reset: vi.fn(),
				getRecommendations: vi.fn(),
			};
			const instanceRule = { id: 'instance-v2', getMetadata: v2Metadata, detect: vi.fn() };
			ruleRegistry.registerAll([
				batchRule as unknown as IBreakingChangeRule,
				instanceRule as unknown as IBreakingChangeRule,
			]);
			const { workflow } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Spontit Node', 'n8n-nodes-base.spontit'),
			]);
			workflowRepository.findOne.mockResolvedValue(workflow as never);

			const result = await service.detectWorkflowHits('v2', 'wf-1');

			expect(workflowRepository.findOne).toHaveBeenCalledWith(
				expect.objectContaining({ where: { id: 'wf-1' } }),
			);
			expect(result).toEqual({
				hits: [{ ruleId: 'removed-nodes-v2', workflowId: 'wf-1' }],
				failedChecks: [],
			});
			expect(batchRule.collectWorkflowData).not.toHaveBeenCalled();
			expect(instanceRule.detect).not.toHaveBeenCalled();
		});

		it('reports a throwing rule as a failed check and keeps the hits of the other rules', async () => {
			const { workflow } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Spontit Node', 'n8n-nodes-base.spontit'),
			]);
			workflowRepository.findOne.mockResolvedValue(workflow as never);
			const throwingRule = ruleRegistry.getRule('file-access-restriction-v2') as FileAccessRule;
			vi.spyOn(throwingRule, 'detectWorkflow').mockRejectedValue(new Error('boom'));

			const result = await service.detectWorkflowHits('v2', 'wf-1');

			expect(result).toEqual({
				hits: [{ ruleId: 'removed-nodes-v2', workflowId: 'wf-1' }],
				failedChecks: [{ ruleId: throwingRule.id, workflowId: 'wf-1' }],
			});
			expect(errorReporter.error).toHaveBeenCalledWith(
				expect.any(Error),
				expect.objectContaining({ extra: { ruleId: throwingRule.id, workflowId: 'wf-1' } }),
			);
		});

		it('returns no hits when the workflow no longer exists', async () => {
			workflowRepository.findOne.mockResolvedValue(null);

			const result = await service.detectWorkflowHits('v2', 'wf-gone');

			expect(result).toEqual({ hits: [], failedChecks: [] });
		});
	});
});
