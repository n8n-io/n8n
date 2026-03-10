import { generateDataFlowWorkflowCode } from './index';
import { parseDataFlowCode } from './dataflow-parser';
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
				inputCode: fixture.input,
				roundTripStatus: 'pass',
			};

			try {
				// Step 1: Parse data-flow code → WorkflowJSON
				const parsed = parseDataFlowCode(fixture.input);
				entry.parsedJson = JSON.stringify(parsed, null, 2);
				entry.nodeCount = parsed.nodes.length;
				entry.connectionCount = Object.keys(parsed.connections).length;

				expect(parsed.nodes.length).toBeGreaterThan(0);

				// Step 2: Re-generate data-flow code from parsed JSON
				const reGenerated = generateDataFlowWorkflowCode(parsed);
				entry.reGeneratedCode = reGenerated;

				// Step 3: Compare normalized code (round-trip fidelity)
				const normalizedInput = normalizeCode(fixture.input);
				const normalizedOutput = normalizeCode(reGenerated);
				entry.codeMatch = normalizedInput === normalizedOutput;

				// Step 4: Validate the parsed workflow JSON
				try {
					const validationResult = validateWorkflow(parsed);
					entry.validationErrors = validationResult.errors.map((e) => `${e.code}: ${e.message}`);
				} catch {
					entry.validationErrors = [];
				}

				// Assertions: the re-generated code should produce the same workflow
				const reParsed = parseDataFlowCode(reGenerated);
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
		it('preserves onError through code → JSON → code', () => {
			const code = `workflow({ name: 'OnError Test' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    try {
      const hTTP_Request = executeNode({ type: 'n8n-nodes-base.httpRequest', params: { url: 'https://api.example.com' }, version: 4 });
    } catch (e) {
      const error_Handler = executeNode({ type: 'n8n-nodes-base.set', name: 'Error Handler', params: {}, version: 3 });
    }
  });
});`;
			const parsed = parseDataFlowCode(code);
			const httpNode = parsed.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest');
			expect(httpNode?.onError).toBe('continueErrorOutput');

			const reGenerated = generateDataFlowWorkflowCode(parsed);
			expect(normalizeCode(reGenerated)).toBe(normalizeCode(code));
		});

		it('preserves credentials through code → JSON → code', () => {
			const code = `workflow({ name: 'Creds Test' }, () => {
  onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
    const hTTP_Request = executeNode({ type: 'n8n-nodes-base.httpRequest', params: { url: 'https://api.example.com' }, credentials: { httpBasicAuth: { id: '1', name: 'My Auth' } }, version: 4 });
  });
});`;
			const parsed = parseDataFlowCode(code);
			const httpNode = parsed.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest');
			expect(httpNode?.credentials).toBeDefined();

			const reGenerated = generateDataFlowWorkflowCode(parsed);
			expect(reGenerated).toContain('httpBasicAuth');
			expect(reGenerated).toContain("name: 'My Auth'");
		});

		it('preserves AI subnodes through code → JSON → code', () => {
			const code = `workflow({ name: 'AI Test' }, () => {
  onTrigger({ type: '@n8n/n8n-nodes-langchain.chatTrigger', params: {}, version: 1 }, (items) => {
    const agent = executeNode({ type: '@n8n/n8n-nodes-langchain.agent', params: { agent: 'conversationalAgent' }, version: 1, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', params: { model: 'gpt-4' }, version: 1 }) } });
  });
});`;
			const parsed = parseDataFlowCode(code);

			// AI model node should exist
			const modelNode = parsed.nodes.find(
				(n) => n.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			);
			expect(modelNode).toBeDefined();

			// Should have AI connection
			const hasAiConn = Object.values(parsed.connections).some((nodeConns) => {
				const conns = nodeConns as Record<string, unknown>;
				return Object.keys(conns).some((k) => k.startsWith('ai_'));
			});
			expect(hasAiConn).toBe(true);

			const reGenerated = generateDataFlowWorkflowCode(parsed);
			expect(reGenerated).toContain('languageModel(');
			expect(reGenerated).toContain('model:');
			expect(reGenerated).toContain('lmChatOpenAi');
		});
	});
});
