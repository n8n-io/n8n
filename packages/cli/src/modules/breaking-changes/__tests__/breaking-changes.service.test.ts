import { mockLogger } from '@n8n/backend-test-utils';
import type { WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { ErrorReporter } from 'n8n-core';
import type { INode } from 'n8n-workflow';

import { N8N_VERSION } from '../../../constants';
import { RuleRegistry } from '../breaking-changes.rule-registry.service';
import { BreakingChangeService } from '../breaking-changes.service';
import { FileAccessRule } from '../rules/v2/file-access.rule';
import { ProcessEnvAccessRule } from '../rules/v2/process-env-access.rule';
import { RemovedNodesRule } from '../rules/v2/removed-nodes.rule';

import type { CacheService } from '@/services/cache/cache.service';

describe('BreakingChangeService', () => {
	const logger = mockLogger();

	let workflowRepository: jest.Mocked<WorkflowRepository>;
	let ruleRegistry: RuleRegistry;
	let service: BreakingChangeService;

	const createWorkflow = (id: string, name: string, nodes: INode[], active = true) =>
		({
			id,
			name,
			active,
			nodes,
		}) as WorkflowEntity;

	const createNode = (name: string, type: string, parameters: unknown = {}): INode => ({
		id: `node-${name}`,
		name,
		type,
		typeVersion: 1,
		position: [0, 0],
		parameters: parameters as INode['parameters'],
	});

	beforeEach(() => {
		jest.clearAllMocks();

		workflowRepository = mock<WorkflowRepository>();
		ruleRegistry = new RuleRegistry(logger);

		service = new BreakingChangeService(
			ruleRegistry,
			workflowRepository,
			mock<CacheService>(),
			logger,
			mock<ErrorReporter>(),
		);

		// Manually register rules with real instances (mocked WorkflowRepository)
		const removedNodesRule = new RemovedNodesRule();
		const processEnvAccessRule = new ProcessEnvAccessRule();
		const fileAccessRule = new FileAccessRule();

		ruleRegistry.registerAll([removedNodesRule, processEnvAccessRule, fileAccessRule]);
	});

	describe('detect()', () => {
		it('should return a report with no issues when no workflows are affected', async () => {
			workflowRepository.find.mockResolvedValue([]);

			const report = await service.detect('v2');

			expect(report).toMatchObject({
				targetVersion: 'v2',
				currentVersion: N8N_VERSION,
				summary: {
					totalIssues: 0,
					criticalIssues: 0,
				},
				results: [],
			});
			expect(report.generatedAt).toBeInstanceOf(Date);
		});

		it('should aggregate results from multiple rules', async () => {
			// Create a workflow that triggers all three rules
			const workflow = createWorkflow('wf-1', 'Complex Workflow', [
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
			expect(report.targetVersion).toBe('v2');
			expect(report.currentVersion).toBe(N8N_VERSION);
			expect(report.generatedAt).toBeInstanceOf(Date);

			// Verify all three rules detected issues
			expect(report.summary.totalIssues).toBe(3);
			expect(report.summary.criticalIssues).toBe(1); // Only RemovedNodesRule is critical

			// Verify each rule's result is in the report
			const removedNodesResult = report.results.find((r) => r.ruleId === 'removed-nodes-v2');
			expect(removedNodesResult?.affectedWorkflows).toHaveLength(1);

			const processEnvResult = report.results.find((r) => r.ruleId === 'process-env-access-v2');
			expect(processEnvResult?.affectedWorkflows).toHaveLength(1);

			const fileAccessResult = report.results.find(
				(r) => r.ruleId === 'file-access-restriction-v2',
			);
			expect(fileAccessResult?.affectedWorkflows).toHaveLength(1);
		});

		it('should correctly count critical issues', async () => {
			const workflow1 = createWorkflow('wf-1', 'Workflow 1', [
				createNode('Spontit Node', 'n8n-nodes-base.spontit'), // Critical severity
			]);
			const workflow2 = createWorkflow('wf-2', 'Workflow 2', [
				createNode('File Node', 'n8n-nodes-base.readWriteFile'), // High severity (not critical)
			]);
			workflowRepository.find.mockResolvedValue([workflow1, workflow2]);
			workflowRepository.count.mockResolvedValue(2);

			const report = await service.detect('v2');

			expect(report.summary.totalIssues).toBe(2);
			expect(report.summary.criticalIssues).toBe(1); // Only removed nodes is critical
		});

		it('should include all required fields in the report', async () => {
			workflowRepository.find.mockResolvedValue([]);
			workflowRepository.count.mockResolvedValue(0);

			const report = await service.detect('v2');

			expect(report).toHaveProperty('generatedAt');
			expect(report).toHaveProperty('targetVersion', 'v2');
			expect(report).toHaveProperty('currentVersion', N8N_VERSION);
			expect(report).toHaveProperty('summary');
			expect(report.summary).toHaveProperty('totalIssues');
			expect(report.summary).toHaveProperty('criticalIssues');
			expect(report).toHaveProperty('results');
			expect(Array.isArray(report.results)).toBe(true);
		});
	});
});
