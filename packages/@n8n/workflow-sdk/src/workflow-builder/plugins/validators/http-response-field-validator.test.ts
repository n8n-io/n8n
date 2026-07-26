import { httpResponseFieldValidator } from './http-response-field-validator';
import type { ConnectionTarget, GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

function createMockNode(
	type: string,
	name: string,
	parameters: Record<string, unknown> = {},
): NodeInstance<string, string, unknown> {
	return {
		type,
		name,
		version: '4.2',
		config: { parameters },
	} as NodeInstance<string, string, unknown>;
}

function createGraphNode(
	node: NodeInstance<string, string, unknown>,
	connections: Map<string, Map<number, ConnectionTarget[]>> = new Map(),
): GraphNode {
	return { instance: node, connections };
}

function connect(source: GraphNode, targetName: string): void {
	const main = source.connections.get('main') ?? new Map<number, ConnectionTarget[]>();
	const targets = main.get(0) ?? [];
	targets.push({ node: targetName, type: 'main', index: 0 });
	main.set(0, targets);
	source.connections.set('main', main);
}

function createCtx(nodes: Map<string, GraphNode>): PluginContext {
	return { nodes, workflowId: 'test', workflowName: 'Test', settings: {} };
}

describe('httpResponseFieldValidator', () => {
	it('has correct id', () => {
		expect(httpResponseFieldValidator.id).toBe('core:http-response-field');
	});

	it('flags $json.body after text-format HTTP Request', () => {
		const http = createMockNode('n8n-nodes-base.httpRequest', 'Fetch HTML', {
			url: 'https://example.com',
			options: { response: { response: { responseFormat: 'text' } } },
		});
		const code = createMockNode('n8n-nodes-base.code', 'Check Length', {
			jsCode: 'return [{ json: { len: ($json.body || "").length } }];',
		});
		const httpGraph = createGraphNode(http);
		const codeGraph = createGraphNode(code);
		connect(httpGraph, 'Check Length');
		const nodes = new Map([
			['Fetch HTML', httpGraph],
			['Check Length', codeGraph],
		]);

		const issues = httpResponseFieldValidator.validateWorkflow?.(createCtx(nodes)) ?? [];
		expect(issues).toContainEqual(expect.objectContaining({ code: 'HTTP_TEXT_BODY_FIELD' }));
	});

	it('flags item.json.body after text-format HTTP Request', () => {
		const http = createMockNode('n8n-nodes-base.httpRequest', 'Fetch Last 24h Emails (EWS)', {
			method: 'POST',
			url: 'https://exchange.company.com/EWS/Exchange.asmx',
			options: { response: { response: { responseFormat: 'text' } } },
		});
		const code = createMockNode('n8n-nodes-base.code', 'Aggregate Emails', {
			jsCode:
				"const items = $input.all();\nconst emails = items.map((item) => {\n  const xml = item.json.body || '';\n  return xml;\n});",
		});
		const httpGraph = createGraphNode(http);
		const codeGraph = createGraphNode(code);
		connect(httpGraph, 'Aggregate Emails');
		const nodes = new Map([
			['Fetch Last 24h Emails (EWS)', httpGraph],
			['Aggregate Emails', codeGraph],
		]);

		const issues = httpResponseFieldValidator.validateWorkflow?.(createCtx(nodes)) ?? [];
		expect(issues).toContainEqual(
			expect.objectContaining({
				code: 'HTTP_TEXT_BODY_FIELD',
				nodeName: 'Aggregate Emails',
				parameterPath: 'jsCode',
			}),
		);
	});

	it('allows item.json.data after text-format HTTP Request', () => {
		const http = createMockNode('n8n-nodes-base.httpRequest', 'Fetch HTML', {
			url: 'https://example.com',
			options: { response: { response: { responseFormat: 'text' } } },
		});
		const code = createMockNode('n8n-nodes-base.code', 'Check Length', {
			jsCode:
				'return $input.all().map((item) => ({ json: { len: (item.json.data || "").length } }));',
		});
		const httpGraph = createGraphNode(http);
		const codeGraph = createGraphNode(code);
		connect(httpGraph, 'Check Length');
		const nodes = new Map([
			['Fetch HTML', httpGraph],
			['Check Length', codeGraph],
		]);

		expect(httpResponseFieldValidator.validateWorkflow?.(createCtx(nodes)) ?? []).toEqual([]);
	});

	it('allows $json.data after text-format HTTP Request', () => {
		const http = createMockNode('n8n-nodes-base.httpRequest', 'Fetch HTML', {
			url: 'https://example.com',
			options: { response: { response: { responseFormat: 'text' } } },
		});
		const code = createMockNode('n8n-nodes-base.code', 'Check Length', {
			jsCode: 'return [{ json: { len: ($json.data || "").length } }];',
		});
		const httpGraph = createGraphNode(http);
		const codeGraph = createGraphNode(code);
		connect(httpGraph, 'Check Length');
		const nodes = new Map([
			['Fetch HTML', httpGraph],
			['Check Length', codeGraph],
		]);

		expect(httpResponseFieldValidator.validateWorkflow?.(createCtx(nodes)) ?? []).toEqual([]);
	});

	it('ignores json-format HTTP Request', () => {
		const http = createMockNode('n8n-nodes-base.httpRequest', 'Fetch JSON', {
			url: 'https://example.com',
			options: { response: { response: { responseFormat: 'json' } } },
		});
		const code = createMockNode('n8n-nodes-base.code', 'Read Body', {
			jsCode: 'return [{ json: { v: $json.body } }];',
		});
		const httpGraph = createGraphNode(http);
		const codeGraph = createGraphNode(code);
		connect(httpGraph, 'Read Body');
		const nodes = new Map([
			['Fetch JSON', httpGraph],
			['Read Body', codeGraph],
		]);

		expect(httpResponseFieldValidator.validateWorkflow?.(createCtx(nodes)) ?? []).toEqual([]);
	});
});
