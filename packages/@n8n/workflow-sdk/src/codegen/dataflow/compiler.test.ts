import { generateDataFlowFromGraph } from './index';
import { parseDataFlowCodeToGraph } from './dataflow-parser';
import { semanticGraphToWorkflowJSON } from '../semantic-graph';
import { generateReport } from './generate-report';
import { loadFixtures } from './fixture-loader';
import { validateWorkflow } from '../../validation';
import type { CompilerTestEntry } from './compiler-types';

export type { CompilerTestEntry };

const testEntries: CompilerTestEntry[] = [];

export function getTestEntries(): CompilerTestEntry[] {
	return testEntries;
}

// ---------------------------------------------------------------------------
// Normalization: strip whitespace differences for code comparison
// ---------------------------------------------------------------------------

function normalizeCode(code: string): string {
	return code
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.join('\n');
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Data-flow compiler (fixture round-trip)', () => {
	afterAll(() => {
		generateReport(testEntries);
	});

	const fixtures = loadFixtures();

	for (const fixture of fixtures) {
		if (fixture.skip) {
			testEntries.push({
				title: fixture.title,
				dirName: fixture.dir,
				skip: fixture.skip,
				templateId: fixture.templateId,
				inputCode: fixture.input,
				roundTripStatus: 'skip',
			});
			it.skip(`${fixture.title}`, () => {});
			continue;
		}

		it(`${fixture.title} [compile]`, () => {
			const entry: CompilerTestEntry = {
				title: fixture.title,
				dirName: fixture.dir,
				templateId: fixture.templateId,
				inputCode: fixture.input,
				roundTripStatus: 'pass',
			};

			try {
				// Step 1: Parse code → SemanticGraph
				const graph1 = parseDataFlowCodeToGraph(fixture.input);
				const parsed = semanticGraphToWorkflowJSON(graph1, fixture.title);
				entry.parsedJson = JSON.stringify(parsed, null, 2);
				entry.nodeCount = parsed.nodes.length;
				entry.connectionCount = Object.keys(parsed.connections).length;

				expect(graph1.nodes.size).toBeGreaterThan(0);

				// Step 2: SemanticGraph → Code (no JSON intermediary)
				const reGenerated = generateDataFlowFromGraph(graph1, fixture.title);
				entry.reGeneratedCode = reGenerated;

				// Step 3: Code → SemanticGraph again, compare via JSON serialization
				const graph2 = parseDataFlowCodeToGraph(reGenerated);
				const reParsed = semanticGraphToWorkflowJSON(graph2, fixture.title);
				entry.codeMatch =
					JSON.stringify(reParsed.nodes) === JSON.stringify(parsed.nodes) &&
					JSON.stringify(reParsed.connections) === JSON.stringify(parsed.connections);

				// Step 4: Validate the parsed workflow JSON
				try {
					const validationResult = validateWorkflow(parsed);
					entry.validationErrors = validationResult.errors.map((e) => `${e.code}: ${e.message}`);
				} catch {
					entry.validationErrors = [];
				}

				// Assertions: graphs produce the same JSON
				expect(reParsed.nodes).toEqual(parsed.nodes);
				expect(reParsed.connections).toEqual(parsed.connections);
			} catch (err) {
				entry.roundTripStatus = 'error';
				entry.roundTripError = err instanceof Error ? err.message : String(err);
				throw err;
			} finally {
				testEntries.push(entry);
			}
		});
	}

	// Additional round-trip assertion tests

	describe('round-trip property preservation', () => {
		it('preserves onError through code → graph → code', () => {
			const code = `workflow({ name: 'OnError Test' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const hTTP_Request = executeNode({ type: 'n8n-nodes-base.httpRequest', params: { url: 'https://api.example.com' }, version: 4 })
      .handleError((items) => {
        const error_Handler = executeNode({ type: 'n8n-nodes-base.set', name: 'Error Handler', params: {}, version: 3 });
      });
  });
});`;
			const graph = parseDataFlowCodeToGraph(code);
			const json = semanticGraphToWorkflowJSON(graph, 'OnError Test');
			const httpNode = json.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest');
			expect(httpNode?.onError).toBe('continueErrorOutput');

			const reGenerated = generateDataFlowFromGraph(graph, 'OnError Test');
			expect(normalizeCode(reGenerated)).toBe(normalizeCode(code));
		});

		it('preserves credentials through code → graph → code', () => {
			const code = `workflow({ name: 'Creds Test' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const hTTP_Request = executeNode({ type: 'n8n-nodes-base.httpRequest', params: { url: 'https://api.example.com' }, credentials: { httpBasicAuth: { id: '1', name: 'My Auth' } }, version: 4 });
  });
});`;
			const graph = parseDataFlowCodeToGraph(code);
			const json = semanticGraphToWorkflowJSON(graph, 'Creds Test');
			const httpNode = json.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest');
			expect(httpNode?.credentials).toBeDefined();

			const reGenerated = generateDataFlowFromGraph(graph, 'Creds Test');
			expect(reGenerated).toContain('httpBasicAuth');
			expect(reGenerated).toContain("name: 'My Auth'");
		});

		it('generates variable references instead of expr() for $json expressions', () => {
			const code = `workflow({ name: 'VarRef Test' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const fetch_Data = executeNode({ type: 'n8n-nodes-base.httpRequest', params: { url: 'https://api.example.com/users' }, version: 4 });
    const transform = executeNode({ type: 'n8n-nodes-base.set', params: { value: fetch_Data.json.name }, version: 3 });
  });
});`;
			const graph = parseDataFlowCodeToGraph(code);
			const json = semanticGraphToWorkflowJSON(graph, 'VarRef Test');
			// The param should be stored as an n8n expression
			expect(json.nodes[2]!.parameters!.value).toBe('={{ $json.name }}');

			const reGenerated = generateDataFlowFromGraph(graph, 'VarRef Test');
			// The regenerated code should use variable references, not expr()
			expect(reGenerated).not.toContain('expr(');
			expect(reGenerated).toContain('.json.name');
		});

		it('converts n8n globals like $now to bare identifiers and round-trips them', () => {
			const code = `import { $now, $today } from 'n8n';

workflow({ name: 'Globals Test' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const set_node = executeNode({ type: 'n8n-nodes-base.set', params: { ts: $now.toISO(), day: $today }, version: 3 });
  });
});`;
			const graph = parseDataFlowCodeToGraph(code);
			const json = semanticGraphToWorkflowJSON(graph, 'Globals Test');
			// The params should be stored as n8n expressions
			expect(json.nodes[1]!.parameters!.ts).toBe('={{ $now.toISO() }}');
			expect(json.nodes[1]!.parameters!.day).toBe('={{ $today }}');

			const reGenerated = generateDataFlowFromGraph(graph, 'Globals Test');
			// The regenerated code should emit an import and use bare globals, not expr()
			expect(reGenerated).toContain("import { $now, $today } from 'n8n';");
			expect(reGenerated).not.toContain('expr(');
			expect(reGenerated).toContain('$now.toISO()');
			expect(reGenerated).toContain('$today');

			// Full round-trip: re-parse the generated code
			const reGraph = parseDataFlowCodeToGraph(reGenerated);
			const reJson = semanticGraphToWorkflowJSON(reGraph, 'Globals Test');
			expect(reJson.nodes[1]!.parameters!.ts).toBe('={{ $now.toISO() }}');
			expect(reJson.nodes[1]!.parameters!.day).toBe('={{ $today }}');
		});

		it('preserves AI subnodes through code → graph → code', () => {
			const code = `workflow({ name: 'AI Test' }, () => {
  onTrigger({ type: '@n8n/n8n-nodes-langchain.chatTrigger', params: {}, version: 1 }, (items) => {
    const agent = executeNode({ type: '@n8n/n8n-nodes-langchain.agent', params: { agent: 'conversationalAgent' }, version: 1, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', params: { model: 'gpt-4' }, version: 1 }) } });
  });
});`;
			const graph = parseDataFlowCodeToGraph(code);
			const json = semanticGraphToWorkflowJSON(graph, 'AI Test');

			// AI model node should exist
			const modelNode = json.nodes.find((n) => n.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi');
			expect(modelNode).toBeDefined();

			// Should have AI connection
			const hasAiConn = Object.values(json.connections).some((nodeConns) => {
				const conns = nodeConns as Record<string, unknown>;
				return Object.keys(conns).some((k) => k.startsWith('ai_'));
			});
			expect(hasAiConn).toBe(true);

			const reGenerated = generateDataFlowFromGraph(graph, 'AI Test');
			expect(reGenerated).toContain('languageModel(');
			expect(reGenerated).toContain('model:');
			expect(reGenerated).toContain('lmChatOpenAi');
		});
	});
});
