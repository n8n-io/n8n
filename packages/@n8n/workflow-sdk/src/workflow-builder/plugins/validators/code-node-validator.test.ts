import { workflow, trigger, node } from '../../../index';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';
import { codeNodeValidator } from './code-node-validator';

function validateCode(parameters: Record<string, unknown>, name = 'Code') {
	const nodeInstance = {
		type: 'n8n-nodes-base.code',
		name,
		version: '2',
		config: { parameters },
	} as NodeInstance<string, string, unknown>;
	const graphNode: GraphNode = { instance: nodeInstance, connections: new Map() };
	const ctx: PluginContext = {
		nodes: new Map([[name, graphNode]]),
		workflowId: 'test-workflow',
		workflowName: 'Test Workflow',
		settings: {},
	};
	return codeNodeValidator.validateNode(nodeInstance, graphNode, ctx);
}

describe('codeNodeValidator', () => {
	it('reports all secret names in jsCode in one issue without the values', () => {
		const issues = validateCode({
			jsCode: [
				'const ADMIN_SECRET = "my-internal-secret-9876";',
				'// const OLD_PASSWORD = "commented-password";',
				'const headers = { Authorization: "Bearer static-token-1", "X-API-Key": "key-12345678" };',
				'item.json.password = "it\'s-a-secret";',
			].join('\n'),
		});

		expect(issues).toEqual([
			expect.objectContaining({
				code: 'HARDCODED_CREDENTIALS',
				severity: 'warning',
				nodeName: 'Code',
				parameterPath: 'jsCode',
			}),
		]);
		const { message } = issues[0];
		for (const name of [
			'ADMIN_SECRET',
			'OLD_PASSWORD',
			'Authorization',
			'X-API-Key',
			'item.json.password',
		]) {
			expect(message).toContain(`"${name}"`);
		}
		for (const value of ['my-internal-secret', 'static-token', 'key-1234', 'a-secret']) {
			expect(message).not.toContain(value);
		}
	});

	it('reports secrets in pythonCode, including values with # or //', () => {
		const issues = validateCode({
			language: 'python',
			pythonCode: 'ADMIN_SECRET = "py#admin//secret"\nheaders = {"X-API-Key": "dict-key-99"}',
		});

		expect(issues).toEqual([
			expect.objectContaining({ code: 'HARDCODED_CREDENTIALS', parameterPath: 'pythonCode' }),
		]);
		expect(issues[0].message).toContain('"ADMIN_SECRET", "X-API-Key"');
	});

	it.each([
		['runtime references', 'const ADMIN_SECRET = $env.ADMIN_SECRET;\nconst apiKey = $json.apiKey;'],
		['empty and short values', 'const token = "";\nconst schema = { password: "string" };'],
		// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
		['template strings', 'const headers = { Authorization: `Bearer ${$json.token}` };'],
		['Python f-strings', 'headers = {"Authorization": f"Bearer {token}"}'],
		['n8n expressions', 'const apiKey = "{{$json.apiKey}}";'],
		[
			'prose',
			'errors.password = "Password is too short";\nthrow new Error("Token verification failed");',
		],
		[
			'non-secret names',
			'fetch(url, { credentials: "include", headers: { Accept: "application/json" } });',
		],
		['JS object shorthand', 'const h = { Authorization: authHeader, Accept: "application/json" };'],
		['masked values', 'item.json.password = "********";'],
		[
			'names that only start with a secret word',
			'const token0 = "0x82aF49447D8a07e3bd95";\nconst cfg = { tokenAddress: "0x833589fcd6edb6e08f4c" };',
		],
	])('ignores %s', (_label, jsCode) => {
		expect(validateCode({ jsCode })).toEqual([]);
	});

	it('runs through workflow.validate() default plugins', () => {
		const wf = workflow('wf-1', 'Secret Code Workflow')
			.add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Start' } }))
			.to(
				node({
					type: 'n8n-nodes-base.code',
					version: 2,
					config: {
						name: 'Verify Secret',
						parameters: {
							jsCode: 'const ADMIN_SECRET = "hardcoded-internal-secret";\nreturn $input.all();',
						},
					},
				}),
			);

		expect(wf.validate().warnings).toContainEqual(
			expect.objectContaining({
				code: 'HARDCODED_CREDENTIALS',
				nodeName: 'Verify Secret',
				parameterPath: 'jsCode',
				severity: 'warning',
			}),
		);
	});

	it('scans large code in linear time', () => {
		const start = Date.now();
		validateCode({ jsCode: `${'token'.repeat(30_000)} ${'token '.repeat(30_000)}` });
		expect(Date.now() - start).toBeLessThan(1000);
	});
});
