import { buildSchemaContexts, findOutputParserTargets } from './context';
import { buildDateAnchors } from './date-anchors';
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
			['AI Root'],
		);

		expect(repaired['AI Root'][0]).toEqual({ json: { output: { summary: 'hi' } } });
	});

	it('wraps flat parsed fields into the output envelope', () => {
		const repaired = repairStructuredAgentOutput({ 'AI Root': [{ json: { summary: 'hi' } }] }, [
			'AI Root',
		]);

		expect(repaired['AI Root'][0]).toEqual({ json: { output: { summary: 'hi' } } });
	});

	it('leaves well-shaped items and plain-text outputs alone', () => {
		const wellShaped = { 'AI Root': [{ json: { output: { summary: 'hi' } } }] };
		expect(repairStructuredAgentOutput(wellShaped, ['AI Root'])).toEqual(wellShaped);

		const plainText = { 'AI Root': [{ json: { output: 'just text' } }] };
		expect(repairStructuredAgentOutput(plainText, ['AI Root'])).toEqual(plainText);
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
