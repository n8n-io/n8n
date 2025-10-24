import type { WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';

import { BreakingChangeSeverity, BreakingChangeCategory, IssueLevel } from '../../../types';
import { ProcessEnvAccessRule } from '../process-env-access.rule';

describe('ProcessEnvAccessRule', () => {
	let rule: ProcessEnvAccessRule;

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
		rule = new ProcessEnvAccessRule();
	});

	describe('getMetadata()', () => {
		it('should return correct metadata', () => {
			const metadata = rule.getMetadata();

			expect(metadata).toEqual({
				id: 'process-env-access-v2',
				version: 'v2',
				title: 'Block process.env Access in Expressions and Code nodes',
				description: 'Direct access to process.env is blocked by default for security',
				category: BreakingChangeCategory.workflow,
				severity: BreakingChangeSeverity.high,
			});
		});
	});

	describe('getRecommendations()', () => {
		it('should return recommendations', async () => {
			const recommendations = await rule.getRecommendations();

			expect(recommendations).toHaveLength(2);
			expect(recommendations).toEqual(
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
	});

	describe('detectWorkflow()', () => {
		it('should return no issues when no process.env usage is found', async () => {
			const workflow = createWorkflow('wf-1', 'Clean Workflow', [
				createNode('Code', 'n8n-nodes-base.code', {
					code: 'const data = $input.all();',
				}),
				createNode('HTTP', 'n8n-nodes-base.httpRequest', {
					url: 'https://api.example.com',
				}),
			]);

			const result = await rule.detectWorkflow(workflow);

			expect(result).toEqual({
				isAffected: false,
				issues: [],
			});
		});

		it('should detect process.env in Code node', async () => {
			const workflow = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Code', 'n8n-nodes-base.code', {
					code: 'const apiKey = process.env.API_KEY;\nreturn { apiKey };',
				}),
			]);

			const result = await rule.detectWorkflow(workflow);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0]).toMatchObject({
				title: 'process.env access detected',
				description:
					"The following nodes contain process.env access: 'Code'. This will be blocked by default in v2.0.0.",
				level: IssueLevel.error,
			});
		});

		it('should detect process.env in node parameters/expressions', async () => {
			const workflow = createWorkflow('wf-1', 'Test Workflow', [
				createNode('HTTP', 'n8n-nodes-base.httpRequest', {
					url: '{{ process.env.API_URL }}',
					authentication: 'none',
				}),
			]);

			const result = await rule.detectWorkflow(workflow);

			expect(result.isAffected).toBe(true);
			expect(result.issues[0]).toMatchObject({
				title: 'process.env access detected',
				level: IssueLevel.error,
			});
			expect(result.issues[0].description).toContain('HTTP');
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

			const result = await rule.detectWorkflow(workflow);

			expect(result.issues[0].description).toContain('Code');
			expect(result.issues[0].description).toContain('HTTP');
			expect(result.issues[0].description).not.toContain('Set');
		});

		it('should not duplicate node names in the same workflow', async () => {
			const workflow = createWorkflow('wf-1', 'Test Workflow', [
				createNode('HTTP', 'n8n-nodes-base.httpRequest', {
					url: '{{ process.env.API_URL }}',
					headers: { authorization: '{{ process.env.TOKEN }}' },
				}),
			]);

			const result = await rule.detectWorkflow(workflow);

			const description = result.issues[0].description;
			const httpCount = (description.match(/HTTP/g) || []).length;
			expect(httpCount).toBe(1);
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

			const result = await rule.detectWorkflow(workflow);

			expect(result.isAffected).toBe(true);
			expect(result.issues[0].description).toContain('Code1');
			expect(result.issues[0].description).toContain('Code2');
			expect(result.issues[0].description).toContain('Code3');
		});
	});
});
