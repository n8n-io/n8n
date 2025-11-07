import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import { BreakingChangeCategory } from '../../../types';
import { ProcessEnvAccessRule } from '../process-env-access.rule';

describe('ProcessEnvAccessRule', () => {
	let rule: ProcessEnvAccessRule;

	beforeEach(() => {
		jest.clearAllMocks();
		rule = new ProcessEnvAccessRule();
	});

	describe('getMetadata()', () => {
		it('should return correct metadata', () => {
			const metadata = rule.getMetadata();

			expect(metadata).toEqual({
				version: 'v2',
				title: 'Block process.env Access in Expressions and Code nodes',
				description: 'Direct access to process.env is blocked by default for security',
				category: BreakingChangeCategory.workflow,
				severity: 'high',
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
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Clean Workflow', [
				createNode('Code', 'n8n-nodes-base.code', {
					code: 'const data = $input.all();',
				}),
				createNode('HTTP', 'n8n-nodes-base.httpRequest', {
					url: 'https://api.example.com',
				}),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result).toEqual({
				isAffected: false,
				issues: [],
			});
		});

		it('should detect process.env in Code node', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Code', 'n8n-nodes-base.code', {
					code: 'const apiKey = process.env.API_KEY;\nreturn { apiKey };',
				}),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0]).toMatchObject({
				title: 'process.env access detected',
				description:
					"Node with name 'Code' accesses process.env which is blocked by default for security reasons.",
				level: 'error',
			});
		});

		it('should detect process.env in node parameters/expressions', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('HTTP', 'n8n-nodes-base.httpRequest', {
					url: '{{ process.env.API_URL }}',
					authentication: 'none',
				}),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues[0]).toMatchObject({
				title: 'process.env access detected',
				level: 'error',
			});
			expect(result.issues[0].description).toContain('HTTP');
		});

		it('should detect process.env in multiple nodes', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
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

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.issues[0].description).toContain('Code');
			expect(result.issues[1].description).toContain('HTTP');
			expect(result.issues).toHaveLength(2);
		});

		it('should not detect false positives', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				// Variable named 'process' but not process.env
				createNode('Code1', 'n8n-nodes-base.code', {
					code: 'const process = { data: "test" }; return process;',
				}),
				// String containing 'process.environment' as text (not process.env)
				createNode('Code2', 'n8n-nodes-base.code', {
					code: 'const message = "This string mentions process.environment but not the actual object";',
				}),
				// process without env
				createNode('Code3', 'n8n-nodes-base.code', {
					code: 'const pid = process.pid;',
				}),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			// None of these should be detected as they don't access process.env
			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it.each([
			['standard property access', 'const x = process.env.VAR;'],
			['bracket notation with double quotes', 'const x = process.env["VAR"];'],
			['bracket notation with single quotes', "const x = process.env['VAR'];"],
			['multiple spaces between process and .env', 'const x = process   .env.VAR;'],
			['tab characters', 'const x = process\t.env.VAR;'],
			['newline between process and .env', 'const x = process\n.env.VAR;'],
			['block comment between process and .env', 'const x = process/* comment */.env.VAR;'],
			['block comment with newlines', 'const x = process/*\n multiline\n comment\n*/.env.VAR;'],
			['multiple spaces and newlines', 'const x = process  \n  .env.VAR;'],
			['mixed whitespace, tabs, and spaces', 'const x = process \t \n .env.VAR;'],
			['comment and whitespace combination', 'const x = process /* test */ \n .env.VAR;'],
			['Windows-style line endings (CRLF)', 'const x = process\r\n.env.VAR;'],
			['multiple property accesses', 'const x = process.env.VAR1; const y = process.env.VAR2;'],
			['in template literal', 'const x = `$' + '{process.env.VAR}`;'],
			['destructuring', 'const { VAR } = process.env;'],
			['in function call', 'console.log(process.env.VAR);'],
			['optional chaining (process?.env)', 'const x = process?.env?.VAR;'],
			['multiple spaces with optional chaining', 'const x = process  ?.env.VAR;'],
		])('should detect process.env with %s', async (_description, code) => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Code', 'n8n-nodes-base.code', { code }),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].description).toContain('Code');
		});
	});
});
