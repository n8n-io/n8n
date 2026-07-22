import { buildSchemaContexts, findOutputParserTargets } from './context';
import { buildDateAnchors } from './date-anchors';
import { workflowToMermaid } from './mermaid';
import { parsePinDataResponse, repairStructuredOutput } from './parse';
import { buildNodeSchemaSection, buildPinDataUserPrompt } from './prompt';
import type { NodeSchemaContext, OutputSchemaLookup } from './types';
import { buildFieldViolationRetryMessage, collectPinFieldViolations } from './validate';
import type { NodeJSON, WorkflowJSON } from '../types/base';

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
			hasOutputParser: false,
		});
		expect(contexts[0].schema).toEqual({ type: 'object', properties: { id: {} } });
	});

	it('requests the with-parser variant for parser targets', () => {
		const lookup: OutputSchemaLookup = vi.fn().mockReturnValue(undefined);

		buildSchemaContexts([workflow.nodes[1]], lookup, findOutputParserTargets(workflow));

		expect(lookup).toHaveBeenCalledWith(expect.objectContaining({ hasOutputParser: true }));
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

	it('embeds schemas, envelope targeting, consumers, and trailing date anchors', () => {
		const contexts = buildSchemaContexts(
			workflow.nodes.filter((n) => n.name === 'Get Rows' || n.name === 'AI Root'),
			({ type, hasOutputParser }) => {
				if (type === 'n8n-nodes-base.dataTable') return { type: 'object' };
				if (hasOutputParser) {
					return {
						type: 'object',
						required: ['output'],
						properties: { output: { type: 'object' } },
					};
				}
				return undefined;
			},
			findOutputParserTargets(workflow),
		);

		const prompt = buildPinDataUserPrompt(workflow, contexts, {
			instructions: { dataDescription: 'CRM rows', testScenario: 'store is empty' },
			dateAnchors: anchors,
		});

		expect(prompt).toContain('## Data Generation Instructions');
		expect(prompt).toContain('## Test Scenario (authoritative — overrides everything above)');
		expect(prompt).toContain('- Output JSON Schema:');
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

	it('drops phantom empty items so a zero-item premise pins as []', () => {
		expect(parsePinDataResponse(JSON.stringify({ 'Get Rows': [{}] }), ['Get Rows'])).toEqual({
			'Get Rows': [],
		});
		expect(
			parsePinDataResponse(JSON.stringify({ 'Get Rows': [{ json: {} }] }), ['Get Rows']),
		).toEqual({ 'Get Rows': [] });
	});

	it('keeps real items when dropping empty ones, and items with non-json payloads', () => {
		expect(
			parsePinDataResponse(JSON.stringify({ 'Get Rows': [{}, { id: 1 }] }), ['Get Rows']),
		).toEqual({ 'Get Rows': [{ json: { id: 1 } }] });
		expect(
			parsePinDataResponse(JSON.stringify({ 'Get Rows': [{ json: {}, binary: { data: {} } }] }), [
				'Get Rows',
			]),
		).toEqual({ 'Get Rows': [{ json: {}, binary: { data: {} } }] });
	});
});

describe('repairStructuredOutput', () => {
	const withParserVariant = {
		type: 'object',
		required: ['output'],
		properties: { output: { type: 'object' } },
	};
	// The envelope is purely schema-derived: contexts resolved with the
	// with-parser variant are what enables the repair.
	const agentContexts = buildSchemaContexts(
		workflow.nodes,
		({ hasOutputParser }) => (hasOutputParser ? withParserVariant : undefined),
		findOutputParserTargets(workflow),
	);

	it('parses JSON-encoded string outputs', () => {
		const repaired = repairStructuredOutput(
			{ 'AI Root': [{ json: { output: '{"summary":"hi"}' } }] },
			workflow,
			agentContexts,
		);

		expect(repaired['AI Root'][0]).toEqual({ json: { output: { summary: 'hi' } } });
	});

	it('wraps flat parsed fields into the output envelope without mutating the input', () => {
		const input = { 'AI Root': [{ json: { summary: 'hi' } }] };
		const repaired = repairStructuredOutput(input, workflow, agentContexts);

		expect(repaired['AI Root'][0]).toEqual({ json: { output: { summary: 'hi' } } });
		expect(input['AI Root'][0]).toEqual({ json: { summary: 'hi' } });
	});

	it('leaves well-shaped items and plain-text outputs alone', () => {
		const wellShaped = { 'AI Root': [{ json: { output: { summary: 'hi' } } }] };
		expect(repairStructuredOutput(wellShaped, workflow, agentContexts)).toEqual(wellShaped);

		const plainText = { 'AI Root': [{ json: { output: 'just text' } }] };
		expect(repairStructuredOutput(plainText, workflow, agentContexts)).toEqual(plainText);
	});

	it('does nothing without resolved schemas — no hardcoded envelope fallback', () => {
		const flat = { 'AI Root': [{ json: { summary: 'hi' } }] };

		expect(repairStructuredOutput(flat, workflow)).toEqual(flat);
	});

	it('repairs chainLlm parser targets into the output envelope like agent', () => {
		// The structured output parser emits `{ output: ... }` for chainLlm too
		// (verified against N8nStructuredOutputParser for parser versions ≥1.1) —
		// its with-parser `__schema__` variant declares the same envelope.
		const chainWorkflow = {
			nodes: [
				{ name: 'Chain', type: '@n8n/n8n-nodes-langchain.chainLlm', typeVersion: 1.9 },
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
		const chainContexts = buildSchemaContexts(
			chainWorkflow.nodes,
			({ hasOutputParser }) => (hasOutputParser ? withParserVariant : undefined),
			findOutputParserTargets(chainWorkflow),
		);
		const flat = { Chain: [{ json: { summary: 'hi' } }] };

		expect(repairStructuredOutput(flat, chainWorkflow, chainContexts)['Chain'][0]).toEqual({
			json: { output: { summary: 'hi' } },
		});
	});

	it('never touches parser targets whose variant declares no envelope', () => {
		const flatRootWorkflow = {
			nodes: [
				{ name: 'Root', type: 'n8n-nodes-future.flatRoot', typeVersion: 1 },
				{
					name: 'Parser',
					type: '@n8n/n8n-nodes-langchain.outputParserStructured',
					typeVersion: 1.2,
					parameters: { schemaType: 'manual', inputSchema: '{"type":"object"}' },
				},
			],
			connections: {
				Parser: { ai_outputParser: [[{ node: 'Root', type: 'ai_outputParser', index: 0 }]] },
			},
		} as unknown as WorkflowJSON;
		const flat = { Root: [{ json: { summary: 'hi' } }] };

		// No contexts (unknown type has no fallback) and an explicitly flat variant.
		expect(repairStructuredOutput(flat, flatRootWorkflow)).toEqual(flat);
		const flatVariantContexts = buildSchemaContexts(
			flatRootWorkflow.nodes,
			({ hasOutputParser }) =>
				hasOutputParser ? { type: 'object', additionalProperties: true } : undefined,
			findOutputParserTargets(flatRootWorkflow),
		);
		expect(repairStructuredOutput(flat, flatRootWorkflow, flatVariantContexts)).toEqual(flat);
	});

	it('derives the envelope key from the with-parser schema — no hardcoded node list', () => {
		const futureWorkflow = {
			nodes: [
				{ name: 'Root', type: 'n8n-nodes-future.structuredRoot', typeVersion: 1 },
				{
					name: 'Parser',
					type: '@n8n/n8n-nodes-langchain.outputParserStructured',
					typeVersion: 1.2,
					parameters: { schemaType: 'manual', inputSchema: '{"type":"object"}' },
				},
			],
			connections: {
				Parser: { ai_outputParser: [[{ node: 'Root', type: 'ai_outputParser', index: 0 }]] },
			},
		} as unknown as WorkflowJSON;
		const contexts = buildSchemaContexts(
			futureWorkflow.nodes,
			({ hasOutputParser }) =>
				hasOutputParser
					? { type: 'object', required: ['data'], properties: { data: { type: 'object' } } }
					: undefined,
			findOutputParserTargets(futureWorkflow),
		);

		const repaired = repairStructuredOutput(
			{ Root: [{ json: { data: '{"a":1}' } }, { json: { a: 2 } }] },
			futureWorkflow,
			contexts,
		);

		expect(repaired.Root[0]).toEqual({ json: { data: { a: 1 } } });
		expect(repaired.Root[1]).toEqual({ json: { data: { a: 2 } } });
	});
});

describe('information extractor own-schema enrichment', () => {
	const extractorNode = {
		name: 'Extract Invoice Details',
		type: '@n8n/n8n-nodes-langchain.informationExtractor',
		typeVersion: 1.2,
		parameters: {
			schemaType: 'fromAttributes',
			attributes: {
				attributes: [
					{ name: 'invoice_number', type: 'string', description: 'The invoice id', required: true },
					{ name: 'total_amount', type: 'number', required: false },
				],
			},
		},
	} as unknown as NodeJSON;
	const extractorWorkflow = {
		nodes: [extractorNode],
		connections: {},
	} as unknown as WorkflowJSON;

	it('surfaces the declared attributes as a schema and a field contract', () => {
		const [ctx] = buildSchemaContexts([extractorNode]);

		expect(ctx.outputParser?.schemaIsExample).toBe(false);
		expect(ctx.outputParser?.schemaText).toContain('"invoice_number"');
		expect(ctx.outputParser?.schemaText).toContain('"total_amount"');
		expect(ctx.outputParser?.schemaText).toContain('"required": [\n    "invoice_number"\n  ]');
		expect(ctx.declaredFields).toEqual({
			keys: ['invoice_number', 'total_amount'],
			envelopeKey: 'output',
			exact: false,
			source: 'declared-schema',
		});
	});

	it('embeds the attribute names in the prompt schema section', () => {
		const [ctx] = buildSchemaContexts([extractorNode]);
		const section = buildNodeSchemaSection(ctx).join('\n');

		expect(section).toContain('total_amount');
		expect(section).toContain('use its exact field names');
	});

	it('reads fromJson examples and manual schemas off the extractor parameters', () => {
		const fromJson = {
			...extractorNode,
			parameters: { schemaType: 'fromJson', jsonSchemaExample: '{"po_number": "PO-1"}' },
		};
		expect(buildSchemaContexts([fromJson])[0].declaredFields).toMatchObject({
			keys: ['po_number'],
			envelopeKey: 'output',
		});

		const manual = {
			...extractorNode,
			parameters: {
				schemaType: 'manual',
				inputSchema: '{"type":"object","properties":{"po_number":{}}}',
			},
		};
		expect(buildSchemaContexts([manual])[0].declaredFields).toMatchObject({
			keys: ['po_number'],
		});
	});

	it('reads schema declarations stored as raw objects (eval-builder quirk)', () => {
		const rawObjectExample = {
			...extractorNode,
			parameters: {
				schemaType: 'fromJson',
				jsonSchemaExample: { amount: 4750, po_number: 'PO-1' },
			},
		};
		expect(buildSchemaContexts([rawObjectExample])[0].declaredFields).toMatchObject({
			keys: ['amount', 'po_number'],
			envelopeKey: 'output',
		});

		const parserWorkflow = {
			nodes: [
				{
					name: 'Invoice Schema',
					type: '@n8n/n8n-nodes-langchain.outputParserStructured',
					typeVersion: 1.2,
					parameters: { schemaType: 'fromJson', jsonSchemaExample: { amount: 1 } },
				},
			],
			connections: {
				'Invoice Schema': {
					ai_outputParser: [[{ node: 'AI Root', type: 'ai_outputParser', index: 0 }]],
				},
			},
		} as unknown as WorkflowJSON;
		expect(findOutputParserTargets(parserWorkflow).get('AI Root')).toEqual({
			schemaText: '{"amount":1}',
			schemaIsExample: true,
		});
	});

	it('repairs flat extractor pins into the output envelope without a parser connection', () => {
		const flat = { 'Extract Invoice Details': [{ json: { invoice_number: 'INV-1' } }] };

		expect(
			repairStructuredOutput(flat, extractorWorkflow, buildSchemaContexts([extractorNode]))[
				'Extract Invoice Details'
			][0],
		).toEqual({ json: { output: { invoice_number: 'INV-1' } } });
	});
});

describe('data table column contracts', () => {
	const dataTableNode = workflow.nodes[0]; // Get Rows

	it('builds an exact contract including the system columns', () => {
		const [ctx] = buildSchemaContexts([dataTableNode], undefined, undefined, {
			'Get Rows': [
				{ name: 'contact_email', type: 'string' },
				{ name: 'contact_name', type: 'string' },
			],
		});

		expect(ctx.declaredFields).toEqual({
			keys: ['id', 'createdAt', 'updatedAt', 'contact_email', 'contact_name'],
			exact: true,
			source: 'data-table-columns',
		});
	});

	it('renders the real columns as the authoritative row shape in the prompt', () => {
		const [ctx] = buildSchemaContexts(
			[dataTableNode],
			() => ({ type: 'object', properties: { id: {} } }),
			undefined,
			{ 'Get Rows': [{ name: 'contact_email', type: 'string' }] },
		);
		const section = buildNodeSchemaSection(ctx).join('\n');

		expect(section).toContain('REAL Data Table columns');
		expect(section).toContain('contact_email (string)');
		// The static `__schema__` (system columns only) is superseded, not embedded.
		expect(section).not.toContain('Output JSON Schema');
	});
});

describe('collectPinFieldViolations', () => {
	const contexts = [
		{
			nodeName: 'Get Rows',
			nodeType: 'n8n-nodes-base.dataTable',
			typeVersion: 1,
			declaredFields: {
				keys: ['id', 'createdAt', 'updatedAt', 'contact_email'],
				exact: true,
				source: 'data-table-columns',
			},
		},
		{
			nodeName: 'Extract',
			nodeType: '@n8n/n8n-nodes-langchain.informationExtractor',
			typeVersion: 1.2,
			declaredFields: {
				keys: ['total_amount', 'po_number'],
				envelopeKey: 'output',
				exact: false,
				source: 'declared-schema',
			},
		},
	] satisfies NodeSchemaContext[];

	it('flags renamed and missing keys on exact contracts', () => {
		const violations = collectPinFieldViolations(
			{
				'Get Rows': [{ json: { id: 1, createdAt: 'x', updatedAt: 'x', email: 'a@example.com' } }],
			},
			contexts,
		);

		expect(violations).toEqual([
			{
				nodeName: 'Get Rows',
				unknownKeys: ['email'],
				missingKeys: ['contact_email'],
				declaredKeys: ['id', 'createdAt', 'updatedAt', 'contact_email'],
				envelopeKey: undefined,
			},
		]);
	});

	it('checks fields inside the declared envelope and allows subsets there', () => {
		const drifted = { Extract: [{ json: { output: { invoice_amount: 5 } } }] };
		expect(collectPinFieldViolations(drifted, contexts)).toMatchObject([
			{ nodeName: 'Extract', unknownKeys: ['invoice_amount'], missingKeys: [] },
		]);

		const subset = { Extract: [{ json: { output: { total_amount: 5 } } }] };
		expect(collectPinFieldViolations(subset, contexts)).toEqual([]);
	});

	it.each([
		['a non-object json payload', 'not a row'],
		['an array json payload', [] as unknown],
	])('flags %s under an exact contract as missing every declared key', (_label, json) => {
		// Skipping malformed items let the pin pass with rows no downstream column
		// expression can resolve — it must take the correction/failure path instead.
		expect(collectPinFieldViolations({ 'Get Rows': [{ json }] }, contexts)).toEqual([
			{
				nodeName: 'Get Rows',
				unknownKeys: [],
				missingKeys: ['id', 'createdAt', 'updatedAt', 'contact_email'],
				declaredKeys: ['id', 'createdAt', 'updatedAt', 'contact_email'],
				envelopeKey: undefined,
			},
		]);
	});

	it('leaves malformed items alone when the contract is not exact', () => {
		// A plain-text agent answer is a legitimate non-object payload.
		expect(collectPinFieldViolations({ Extract: [{ json: 'plain answer' }] }, contexts)).toEqual(
			[],
		);
	});

	it('accepts empty pins, conforming rows, and nodes without contracts', () => {
		const pinData = {
			'Get Rows': [],
			Extract: [{ json: { output: { total_amount: 5, po_number: 'PO-1' } } }],
			Unrelated: [{ json: { whatever: true } }],
		};

		expect(collectPinFieldViolations(pinData, contexts)).toEqual([]);
	});

	it('builds an actionable retry message', () => {
		const message = buildFieldViolationRetryMessage([
			{
				nodeName: 'Get Rows',
				unknownKeys: ['email'],
				missingKeys: ['contact_email'],
				declaredKeys: ['id', 'contact_email'],
				envelopeKey: undefined,
			},
		]);

		expect(message).toContain('Get Rows');
		expect(message).toContain('remove/rename these unknown fields: email');
		expect(message).toContain('every item must also carry: contact_email');
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
		const { isAiRootNodeType, describeAiRootShape } = await import('./ai-root-shapes.js');

		for (const type of [
			'@n8n/n8n-nodes-langchain.informationExtractor',
			'@n8n/n8n-nodes-langchain.textClassifier',
			'@n8n/n8n-nodes-langchain.sentimentAnalysis',
		]) {
			expect(isAiRootNodeType(type)).toBe(true);
		}

		// Shapes live in nodes-langchain `__schema__` files (incl. with-parser
		// variants for agent/chainLlm); the prose only covers the passthrough
		// classifier, vendor nodes, and the no-schema fallback.
		expect(describeAiRootShape('@n8n/n8n-nodes-langchain.textClassifier')).toContain(
			'passed through',
		);
	});

	it('derives the structured envelope key from a with-parser schema', async () => {
		const { findEnvelopeKey } = await import('./ai-root-shapes.js');

		const agentVariant = {
			type: 'object',
			required: ['output'],
			properties: { output: { type: 'object' } },
		};
		const chainLlmVariant = { type: 'object', additionalProperties: true };
		const plainAgent = {
			type: 'object',
			required: ['output'],
			properties: { output: { type: 'string' } },
		};
		// A schema-declared envelope works for any root type — no hardcoded list,
		// and no fallback: an unresolved schema means no envelope.
		const customVariant = {
			type: 'object',
			required: ['data'],
			properties: { data: { type: 'object' } },
		};

		expect(findEnvelopeKey(agentVariant)).toBe('output');
		expect(findEnvelopeKey(customVariant)).toBe('data');
		// Flat layouts, string outputs, and missing schemas declare no envelope.
		expect(findEnvelopeKey(chainLlmVariant)).toBeUndefined();
		expect(findEnvelopeKey(plainAgent)).toBeUndefined();
		expect(findEnvelopeKey(undefined)).toBeUndefined();
	});

	it('prefers a resolved __schema__ over the prose shape line for AI roots', () => {
		const chainNode = {
			name: 'Answer',
			type: '@n8n/n8n-nodes-langchain.chainRetrievalQa',
			typeVersion: 1.7,
			parameters: {},
		} as unknown as WorkflowJSON['nodes'][number];
		const schema = { type: 'object', properties: { response: { type: 'string' } } };

		const [withSchema] = buildSchemaContexts([chainNode], () => schema);
		const withSchemaSection = buildNodeSchemaSection(withSchema).join('\n');
		expect(withSchemaSection).toContain('Output JSON Schema:');
		expect(withSchemaSection).not.toContain('AI ROOT OUTPUT SHAPE');

		// Without a resolved schema the prose fallback still renders.
		const [withoutSchema] = buildSchemaContexts([chainNode]);
		const withoutSchemaSection = buildNodeSchemaSection(withoutSchema).join('\n');
		expect(withoutSchemaSection).toContain('AI ROOT OUTPUT SHAPE');
		expect(withoutSchemaSection).not.toContain('no schema available');
	});

	it('targets the parser schema at the envelope declared by the with-parser variant', () => {
		const flatRootWorkflow = {
			nodes: [
				// textClassifier: a real AI root whose (hypothetical) variant
				// declares no envelope — exercises the flat-targeting path.
				{ name: 'Root', type: '@n8n/n8n-nodes-langchain.textClassifier', typeVersion: 1.1 },
				{
					name: 'Parser',
					type: '@n8n/n8n-nodes-langchain.outputParserStructured',
					typeVersion: 1.2,
					parameters: { schemaType: 'manual', inputSchema: '{"type":"object"}' },
				},
			],
			connections: {
				Parser: { ai_outputParser: [[{ node: 'Root', type: 'ai_outputParser', index: 0 }]] },
			},
		} as unknown as WorkflowJSON;

		// A flat with-parser variant declares no envelope.
		const [flatCtx] = buildSchemaContexts(
			[flatRootWorkflow.nodes[0]],
			() => ({ type: 'object', additionalProperties: true }),
			findOutputParserTargets(flatRootWorkflow),
		);
		expect(buildNodeSchemaSection(flatCtx).join('\n')).toContain('The top-level `json` fields');

		// An envelope-declaring variant redirects the parser schema instruction.
		const [agentCtx] = buildSchemaContexts(
			[workflow.nodes[1]],
			() => ({ type: 'object', required: ['output'], properties: { output: { type: 'object' } } }),
			findOutputParserTargets(workflow),
		);
		expect(buildNodeSchemaSection(agentCtx).join('\n')).toContain('The `output` object');
	});

	it('classifies the assistant and vendor LLM nodes as AI roots', async () => {
		const { isAiRootNodeType, describeAiRootShape } = await import('./ai-root-shapes.js');

		// Mirrors the editor's canonical VENDOR_AI_ROOT_NODE_TYPES list
		// (evaluation.ee/evaluation.constants.ts).
		for (const type of [
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

		// Vendor nodes emit their API response; there is no `output` wrapper.
		expect(describeAiRootShape('@n8n/n8n-nodes-langchain.anthropic')).toContain(
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
