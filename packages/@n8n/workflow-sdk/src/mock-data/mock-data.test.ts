import { buildSchemaContexts, findOutputParserTargets } from './context';
import { buildDateAnchors } from './date-anchors';
import { workflowToMermaid } from './mermaid';
import { parsePinDataResponse, repairStructuredAgentOutput } from './parse';
import { buildPinDataUserPrompt } from './prompt';
import type { OutputSchemaLookup } from './types';
import type { WorkflowJSON } from '../types/base';

const workflow = {
	nodes: [
		{
			name: 'Get Rows',
			type: 'n8n-nodes-base.dataTable',
			typeVersion: 1,
			parameters: { resource: 'row', operation: 'get' },
		},
		{
			name: 'AI Root',
			type: '@n8n/n8n-nodes-langchain.agent',
			typeVersion: 1.7,
			parameters: {},
		},
		{
			name: 'Parser',
			type: '@n8n/n8n-nodes-langchain.outputParserStructured',
			typeVersion: 1.2,
			parameters: { schemaType: 'manual', inputSchema: '{"type":"object"}' },
		},
		{
			name: 'Send Digest',
			type: 'n8n-nodes-base.slack',
			typeVersion: 2.3,
			parameters: { text: '={{ $json.output.summary }}' },
		},
	],
	connections: {
		Parser: { ai_outputParser: [[{ node: 'AI Root', type: 'ai_outputParser', index: 0 }]] },
		'AI Root': { main: [[{ node: 'Send Digest', type: 'main', index: 0 }]] },
	},
} as unknown as WorkflowJSON;

describe('findOutputParserTargets', () => {
	it('maps parser targets with manual-mode schema text', () => {
		const targets = findOutputParserTargets(workflow);

		expect(targets.get('AI Root')).toEqual({
			schemaText: '{"type":"object"}',
			schemaIsExample: false,
		});
		expect(targets.has('Get Rows')).toBe(false);
	});

	it('marks fromJson examples as examples', () => {
		const wf = {
			nodes: [
				{
					name: 'Parser',
					type: '@n8n/n8n-nodes-langchain.outputParserStructured',
					typeVersion: 1.2,
					parameters: { schemaType: 'fromJson', jsonSchemaExample: '{"total": 1}' },
				},
			],
			connections: {
				Parser: { ai_outputParser: [[{ node: 'AI Root', type: 'ai_outputParser', index: 0 }]] },
			},
		} as unknown as WorkflowJSON;

		expect(findOutputParserTargets(wf).get('AI Root')).toEqual({
			schemaText: '{"total": 1}',
			schemaIsExample: true,
		});
	});
});

describe('buildSchemaContexts', () => {
	it('enriches nodes through the injected lookup', () => {
		const lookup: OutputSchemaLookup = vi
			.fn()
			.mockReturnValue({ type: 'object', properties: { id: {} } });

		const contexts = buildSchemaContexts([workflow.nodes[0]], lookup);

		expect(lookup).toHaveBeenCalledWith({
			type: 'n8n-nodes-base.dataTable',
			typeVersion: 1,
			resource: 'row',
			operation: 'get',
		});
		expect(contexts[0].schema).toEqual({ type: 'object', properties: { id: {} } });
	});

	it('produces schema-less contexts without a lookup', () => {
		const contexts = buildSchemaContexts([workflow.nodes[0]]);

		expect(contexts[0]).toMatchObject({
			nodeName: 'Get Rows',
			resource: 'row',
			operation: 'get',
			schema: undefined,
		});
	});
});

describe('buildPinDataUserPrompt', () => {
	const anchors = buildDateAnchors(new Date('2026-01-15T12:00:00Z'));

	it('embeds schemas, AI root shapes, consumers, and trailing date anchors', () => {
		const contexts = buildSchemaContexts(
			workflow.nodes.filter((n) => n.name === 'Get Rows' || n.name === 'AI Root'),
			({ type }) => (type === 'n8n-nodes-base.dataTable' ? { type: 'object' } : undefined),
			findOutputParserTargets(workflow),
		);

		const prompt = buildPinDataUserPrompt(workflow, contexts, {
			instructions: { dataDescription: 'CRM rows', testScenario: 'store is empty' },
			dateAnchors: anchors,
		});

		expect(prompt).toContain('## Data Generation Instructions');
		expect(prompt).toContain('## Test Scenario (authoritative — overrides everything above)');
		expect(prompt).toContain('- Output JSON Schema:');
		expect(prompt).toContain('AI ROOT OUTPUT SHAPE');
		expect(prompt).toContain('The `output` object must conform to this JSON Schema');
		expect(prompt).toContain('Direct downstream consumers');
		expect(prompt.trimEnd().endsWith(anchors)).toBe(true);
	});

	it('falls back to API knowledge for schema-less non-AI nodes', () => {
		const contexts = buildSchemaContexts([workflow.nodes[0]]);

		const prompt = buildPinDataUserPrompt(workflow, contexts, { dateAnchors: anchors });

		expect(prompt).toContain('(no schema available — generate based on API knowledge)');
	});
});

describe('parsePinDataResponse', () => {
	it('strips code fences and keeps empty arrays', () => {
		expect(parsePinDataResponse('```json\n{ "Get Rows": [] }\n```', ['Get Rows'])).toEqual({
			'Get Rows': [],
		});
	});

	it('wraps raw items and passes json-wrapped items through', () => {
		const result = parsePinDataResponse(
			JSON.stringify({ 'Get Rows': [{ id: 1 }, { json: { id: 2 } }] }),
			['Get Rows'],
		);

		expect(result['Get Rows']).toEqual([{ json: { id: 1 } }, { json: { id: 2 } }]);
	});

	it('returns {} for non-JSON responses and skips unrequested nodes', () => {
		expect(parsePinDataResponse('sorry', ['Get Rows'])).toEqual({});
		expect(parsePinDataResponse(JSON.stringify({ Other: [{}] }), ['Get Rows'])).toEqual({});
	});
});

describe('repairStructuredAgentOutput', () => {
	it('parses JSON-encoded string outputs', () => {
		const repaired = repairStructuredAgentOutput(
			{ 'AI Root': [{ json: { output: '{"summary":"hi"}' } }] },
			workflow,
		);

		expect(repaired['AI Root'][0]).toEqual({ json: { output: { summary: 'hi' } } });
	});

	it('wraps flat parsed fields into the output envelope without mutating the input', () => {
		const input = { 'AI Root': [{ json: { summary: 'hi' } }] };
		const repaired = repairStructuredAgentOutput(input, workflow);

		expect(repaired['AI Root'][0]).toEqual({ json: { output: { summary: 'hi' } } });
		expect(input['AI Root'][0]).toEqual({ json: { summary: 'hi' } });
	});

	it('leaves well-shaped items and plain-text outputs alone', () => {
		const wellShaped = { 'AI Root': [{ json: { output: { summary: 'hi' } } }] };
		expect(repairStructuredAgentOutput(wellShaped, workflow)).toEqual(wellShaped);

		const plainText = { 'AI Root': [{ json: { output: 'just text' } }] };
		expect(repairStructuredAgentOutput(plainText, workflow)).toEqual(plainText);
	});

	it('never touches non-Agent parser targets — chainLlm output stays flat', () => {
		const chainWorkflow = {
			nodes: [
				{ name: 'Chain', type: '@n8n/n8n-nodes-langchain.chainLlm', typeVersion: 1.5 },
				{
					name: 'Parser',
					type: '@n8n/n8n-nodes-langchain.outputParserStructured',
					typeVersion: 1.2,
					parameters: { schemaType: 'manual', inputSchema: '{"type":"object"}' },
				},
			],
			connections: {
				Parser: { ai_outputParser: [[{ node: 'Chain', type: 'ai_outputParser', index: 0 }]] },
			},
		} as unknown as WorkflowJSON;
		const flat = { Chain: [{ json: { summary: 'hi' } }] };

		expect(repairStructuredAgentOutput(flat, chainWorkflow)).toEqual(flat);
	});
});

describe('workflowToMermaid', () => {
	it('renders nodes with resource/operation labels and connections', () => {
		const mermaid = workflowToMermaid(workflow);

		expect(mermaid).toContain('flowchart LR');
		expect(mermaid).toContain('n0["Get Rows (dataTable v1, resource:row, op:get)"]');
		expect(mermaid).toContain('n1["AI Root (agent v1.7)"]');
		expect(mermaid).toContain('n1 --> n3');
	});

	it('escapes quotes and newlines in labels so the flowchart stays parseable', () => {
		const wf = {
			nodes: [
				{
					name: 'Fetch "Today\'s" Data',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					parameters: { resource: 'a"b', operation: 'first\nsecond' },
				},
			],
			connections: {},
		} as unknown as WorkflowJSON;

		const mermaid = workflowToMermaid(wf);

		expect(mermaid).toContain(
			'n0["Fetch #quot;Today\'s#quot; Data (httpRequest v4.2, resource:a#quot;b, op:first second)"]',
		);
		// No label may contain an unescaped double quote.
		const labels = [...mermaid.matchAll(/\["(.*)"\]/g)].map((m) => m[1]);
		expect(labels).toHaveLength(1);
		expect(labels[0]).not.toContain('"');
	});
});

describe('ai-root shapes', () => {
	it('classifies the extractor/classifier/sentiment chains as AI roots', async () => {
		const { isAiRootNodeType, describeAiRootShape } = await import('./ai-root-shapes');

		for (const type of [
			'@n8n/n8n-nodes-langchain.informationExtractor',
			'@n8n/n8n-nodes-langchain.textClassifier',
			'@n8n/n8n-nodes-langchain.sentimentAnalysis',
		]) {
			expect(isAiRootNodeType(type)).toBe(true);
		}

		// Verified against the node implementations: extractor wraps in `output`,
		// classifier passes the input through, sentiment adds `sentimentAnalysis`.
		expect(describeAiRootShape('@n8n/n8n-nodes-langchain.informationExtractor', false)).toContain(
			'"output"',
		);
		expect(describeAiRootShape('@n8n/n8n-nodes-langchain.textClassifier', false)).toContain(
			'passed through',
		);
		expect(describeAiRootShape('@n8n/n8n-nodes-langchain.sentimentAnalysis', false)).toContain(
			'sentimentAnalysis',
		);
	});

	it('classifies the assistant and vendor LLM nodes as AI roots', async () => {
		const { isAiRootNodeType, describeAiRootShape } = await import('./ai-root-shapes');

		// Mirrors the editor's canonical AI_ROOT_NODE_TYPES list
		// (evaluation.ee/evaluation.constants.ts).
		for (const type of [
			'@n8n/n8n-nodes-langchain.openAiAssistant',
			'@n8n/n8n-nodes-langchain.openAi',
			'@n8n/n8n-nodes-langchain.anthropic',
			'@n8n/n8n-nodes-langchain.googleGemini',
			'@n8n/n8n-nodes-langchain.ollama',
			'@n8n/n8n-nodes-langchain.alibabaCloud',
			'@n8n/n8n-nodes-langchain.miniMax',
			'@n8n/n8n-nodes-langchain.moonshot',
		]) {
			expect(isAiRootNodeType(type)).toBe(true);
		}

		// The assistant returns the AgentExecutor result — the `output` envelope.
		expect(describeAiRootShape('@n8n/n8n-nodes-langchain.openAiAssistant', false)).toContain(
			'"output"',
		);
		// Vendor nodes emit their API response; there is no `output` wrapper.
		expect(describeAiRootShape('@n8n/n8n-nodes-langchain.anthropic', false)).toContain(
			'vendor API response',
		);
	});
});

describe('buildDateAnchors', () => {
	it('renders anchors relative to the provided date', () => {
		const anchors = buildDateAnchors(new Date('2026-01-15T12:00:00Z'));

		expect(anchors).toContain('- today: 2026-01-15 (full timestamp 2026-01-15T12:00:00.000Z)');
		expect(anchors).toContain('- yesterday: 2026-01-14');
		expect(anchors).toContain('- 30 days ago: 2025-12-16');
		expect(anchors).toContain('- 7 days from now: 2026-01-22');
	});
});
