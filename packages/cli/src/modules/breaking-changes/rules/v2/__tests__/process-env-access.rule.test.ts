import type { Logger } from '@n8n/backend-common';
import type { WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { INode } from 'n8n-workflow';

import { ProcessEnvAccessRule } from '../process-env-access.rule';
import { BreakingChangeSeverity, BreakingChangeCategory, IssueLevel } from '../../../types';

describe('ProcessEnvAccessRule', () => {
	const logger = mock<Logger>({
		scoped: jest.fn().mockReturnThis(),
		error: jest.fn(),
	});

	let workflowRepository: jest.Mocked<WorkflowRepository>;
	let rule: ProcessEnvAccessRule;

	type WorkflowData = {
		id: string;
		name: string;
		active: boolean;
		nodes: INode[];
	};

	const createWorkflow = (
		id: string,
		name: string,
		nodes: INode[],
		active = true,
	): WorkflowData => ({
		id,
		name,
		active,
		nodes,
	});

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
		rule = new ProcessEnvAccessRule(workflowRepository, logger);
	});

	describe('getMetadata()', () => {
		it('should return correct metadata', () => {
			const metadata = rule.getMetadata();

			expect(metadata).toEqual({
				id: 'process-env-access-v2',
				version: 'v2',
				title: 'Block process.env Access in Expressions',
				description: 'Direct access to process.env is blocked by default for security',
				category: BreakingChangeCategory.WORKFLOW,
				severity: BreakingChangeSeverity.HIGH,
			});
		});
	});

	describe('detect()', () => {
		it('should return no issues when no process.env usage is found', async () => {
			const workflow = createWorkflow('wf-1', 'Clean Workflow', [
				createNode('Code', 'n8n-nodes-base.code', {
					code: 'const data = $input.all();',
				}),
				createNode('HTTP', 'n8n-nodes-base.httpRequest', {
					url: 'https://api.example.com',
				}),
			]);

			workflowRepository.find.mockResolvedValue([workflow as never]);

			const result = await rule.detect();

			expect(result).toEqual({
				ruleId: 'process-env-access-v2',
				isAffected: false,
				affectedWorkflows: [],
				instanceIssues: [],
				recommendations: [],
			});
		});

		it('should detect process.env in Code node', async () => {
			const workflow = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Code', 'n8n-nodes-base.code', {
					code: 'const apiKey = process.env.API_KEY;\nreturn { apiKey };',
				}),
			]);

			workflowRepository.find.mockResolvedValue([workflow as never]);

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.affectedWorkflows).toHaveLength(1);
			expect(result.affectedWorkflows[0]).toMatchObject({
				id: 'wf-1',
				name: 'Test Workflow',
				active: true,
				issues: [
					{
						title: 'process.env access detected',
						description:
							'The following nodes contain process.env access: Code. This will be blocked in v2.0.0.',
						level: IssueLevel.ERROR,
					},
				],
			});
			expect(result.recommendations).toHaveLength(2);
			expect(result.recommendations).toEqual(
				expect.arrayContaining([
					{
						action: 'Remove process.env usage',
						description: 'Replace process.env with environment variables configured in n8n',
					},
					{
						action: 'Enable access if required',
						description: 'Set N8N_BLOCK_ENV_ACCESS_IN_NODE=false to allow access',
					},
				]),
			);
		});

		it('should detect process.env in node parameters/expressions', async () => {
			const workflow = createWorkflow('wf-1', 'Test Workflow', [
				createNode('HTTP', 'n8n-nodes-base.httpRequest', {
					url: '{{ process.env.API_URL }}',
					authentication: 'none',
				}),
			]);

			workflowRepository.find.mockResolvedValue([workflow as never]);

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.affectedWorkflows[0].issues[0]).toMatchObject({
				title: 'process.env access detected',
				level: IssueLevel.ERROR,
			});
			expect(result.affectedWorkflows[0].issues[0].description).toContain('HTTP');
		});

		it('should detect process.env in multiple nodes', async () => {
			const workflow = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Code', 'n8n-nodes-base.code', {
					code: 'const key = process.env.KEY;',
				}),
				createNode('HTTP', 'n8n-nodes-base.httpRequest', {
					url: '{{ process.env.API_URL }}',
				}),
				createNode('Set', 'n8n-nodes-base.set', {
					values: {},
				}),
			]);

			workflowRepository.find.mockResolvedValue([workflow as never]);

			const result = await rule.detect();

			expect(result.affectedWorkflows[0].issues[0].description).toContain('Code');
			expect(result.affectedWorkflows[0].issues[0].description).toContain('HTTP');
			expect(result.affectedWorkflows[0].issues[0].description).not.toContain('Set');
		});

		it('should not duplicate node names in the same workflow', async () => {
			const workflow = createWorkflow('wf-1', 'Test Workflow', [
				createNode('HTTP', 'n8n-nodes-base.httpRequest', {
					url: '{{ process.env.API_URL }}',
					headers: { authorization: '{{ process.env.TOKEN }}' },
				}),
			]);

			workflowRepository.find.mockResolvedValue([workflow as never]);

			const result = await rule.detect();

			const description = result.affectedWorkflows[0].issues[0].description;
			const httpCount = (description.match(/HTTP/g) || []).length;
			expect(httpCount).toBe(1);
		});

		it('should detect issues across multiple workflows', async () => {
			const workflow1 = createWorkflow('wf-1', 'Workflow 1', [
				createNode('Code', 'n8n-nodes-base.code', {
					code: 'process.env.KEY',
				}),
			]);
			const workflow2 = createWorkflow('wf-2', 'Workflow 2', [
				createNode('HTTP', 'n8n-nodes-base.httpRequest', {
					url: '{{ process.env.URL }}',
				}),
			]);

			workflowRepository.find.mockResolvedValue([workflow1 as never, workflow2 as never]);

			const result = await rule.detect();

			expect(result.affectedWorkflows).toHaveLength(2);
			expect(result.affectedWorkflows[0].id).toBe('wf-1');
			expect(result.affectedWorkflows[1].id).toBe('wf-2');
		});

		it('should include inactive workflows', async () => {
			const workflow = createWorkflow(
				'wf-1',
				'Inactive Workflow',
				[
					createNode('Code', 'n8n-nodes-base.code', {
						code: 'process.env.KEY',
					}),
				],
				false,
			);

			workflowRepository.find.mockResolvedValue([workflow as never]);

			const result = await rule.detect();

			expect(result.affectedWorkflows[0]).toMatchObject({
				id: 'wf-1',
				name: 'Inactive Workflow',
				active: false,
			});
		});

		it('should handle various process.env patterns', async () => {
			const workflow = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Code1', 'n8n-nodes-base.code', {
					code: 'const x = process.env.VAR;',
				}),
				createNode('Code2', 'n8n-nodes-base.code', {
					code: 'const x = process.env["VAR"];',
				}),
				createNode('Code3', 'n8n-nodes-base.code', {
					code: "const x = process.env['VAR'];",
				}),
			]);

			workflowRepository.find.mockResolvedValue([workflow as never]);

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.affectedWorkflows[0].issues[0].description).toContain('Code1');
			expect(result.affectedWorkflows[0].issues[0].description).toContain('Code2');
			expect(result.affectedWorkflows[0].issues[0].description).toContain('Code3');
		});

		it('should handle database errors gracefully', async () => {
			workflowRepository.find.mockRejectedValue(new Error('Database connection failed'));

			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
			expect(result.affectedWorkflows).toHaveLength(0);
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to detect process.env access',
				expect.objectContaining({
					error: expect.any(Error),
				}),
			);
		});
	});
});
