import { generateDataFlowWorkflowCode } from './index';
import { parseDataFlowCode } from './dataflow-parser';
import { generateReport } from './generate-report';
import { loadFixtures } from './fixture-loader';
import { validateWorkflow } from '../../validation';
import type { WorkflowJSON, NodeJSON } from '../../types/base';

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

interface NormalizedNode {
	type: string;
	name: string;
	parameters: Record<string, unknown>;
	typeVersion: number;
	credentials?: Record<string, unknown>;
	onError?: string;
}

interface NormalizedWorkflow {
	name: string;
	nodes: NormalizedNode[];
	connections: Record<string, unknown>;
}

function normalizeForComparison(json: WorkflowJSON): NormalizedWorkflow {
	const normalizedNodes = json.nodes
		.filter((n) => !n.type.includes('stickyNote'))
		.map((n) => {
			const node: NormalizedNode = {
				type: n.type,
				name: n.name ?? '',
				parameters: (n.parameters ?? {}) as Record<string, unknown>,
				typeVersion: n.typeVersion ?? 1,
			};
			if (n.credentials) {
				node.credentials = n.credentials as Record<string, unknown>;
			}
			if (n.onError) {
				node.onError = n.onError;
			}
			return node;
		})
		.sort((a, b) => a.name.localeCompare(b.name));

	const normalizedConnections: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(json.connections)) {
		if (!value || typeof value !== 'object') continue;
		const nodeConnections: Record<string, unknown> = {};
		for (const [connType, outputs] of Object.entries(value as Record<string, unknown>)) {
			if (!Array.isArray(outputs)) continue;
			const filteredOutputs = outputs
				.map((output: unknown) => {
					if (!Array.isArray(output)) return [];
					return (output as Array<{ node: string; type: string; index: number }>)
						.filter((c) => c && c.node)
						.map((c) => ({
							node: c.node,
							type: c.type,
							index: c.index,
						}));
				})
				.filter((output: unknown[]) => output.length > 0);
			if (filteredOutputs.length > 0) {
				nodeConnections[connType] = filteredOutputs;
			}
		}
		if (Object.keys(nodeConnections).length > 0) {
			normalizedConnections[key] = nodeConnections;
		}
	}

	return {
		name: json.name ?? '',
		nodes: normalizedNodes,
		connections: normalizedConnections,
	};
}

// ---------------------------------------------------------------------------
// Test data collection (used by report generator)
// ---------------------------------------------------------------------------

export interface CompilerTestEntry {
	title: string;
	dirName: string;
	skip?: string;
	inputJson: string;
	generatedCode?: string;
	parsedJson?: string;
	roundTripStatus: 'pass' | 'error' | 'skip';
	roundTripError?: string;
	nodeTypesMatch?: boolean;
	connectionCountMatch?: boolean;
	parametersMatch?: boolean;
	validationErrors?: string[];
	missingTypes?: string[];
	extraTypes?: string[];
}

const testEntries: CompilerTestEntry[] = [];

// Make test entries accessible for report generation
export function getTestEntries(): CompilerTestEntry[] {
	return testEntries;
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
				inputJson: JSON.stringify(fixture.input, null, 2),
				roundTripStatus: 'skip',
			});
			it.skip(`${fixture.title}`, () => {});
			continue;
		}

		it(`${fixture.title} [compile]`, () => {
			const entry: CompilerTestEntry = {
				title: fixture.title,
				dirName: fixture.dir,
				inputJson: JSON.stringify(fixture.input, null, 2),
				roundTripStatus: 'pass',
			};

			try {
				// Step 1: Generate data-flow code from WorkflowJSON
				const code = generateDataFlowWorkflowCode(fixture.input);
				entry.generatedCode = code;

				expect(code).toContain('workflow(');
				expect(code.length).toBeGreaterThan(0);

				// Step 2: Parse the generated code back to WorkflowJSON
				const parsed = parseDataFlowCode(code);
				entry.parsedJson = JSON.stringify(parsed, null, 2);

				// Step 3: Normalize and compare
				const normOriginal = normalizeForComparison(fixture.input);
				const normParsed = normalizeForComparison(parsed);

				// 3a: Check workflow name
				expect(normParsed.name).toBe(normOriginal.name);

				// 3b: Check node types
				const origTypes = new Set(normOriginal.nodes.map((n) => n.type));
				const parsedTypes = new Set(normParsed.nodes.map((n) => n.type));
				const missingTypes = [...origTypes].filter((t) => !parsedTypes.has(t));
				const extraTypes = [...parsedTypes].filter((t) => !origTypes.has(t));
				entry.missingTypes = missingTypes;
				entry.extraTypes = extraTypes;
				entry.nodeTypesMatch = missingTypes.length === 0;

				// 3c: Check connection count
				const origConnCount = Object.keys(normOriginal.connections).length;
				const parsedConnCount = Object.keys(normParsed.connections).length;
				entry.connectionCountMatch = parsedConnCount >= origConnCount;

				// 3d: Check parameters for nodes that exist in both
				let parametersMatch = true;
				for (const origNode of normOriginal.nodes) {
					const parsedNode = normParsed.nodes.find((n) => n.type === origNode.type);
					if (
						parsedNode &&
						Object.keys(origNode.parameters).length > 0 &&
						JSON.stringify(parsedNode.parameters) !== JSON.stringify(origNode.parameters)
					) {
						parametersMatch = false;
					}
				}
				entry.parametersMatch = parametersMatch;

				// Step 4: Validate the parsed workflow JSON
				try {
					const validationResult = validateWorkflow(parsed);
					entry.validationErrors = validationResult.errors.map((e) => `${e.code}: ${e.message}`);
				} catch {
					// Validation may not be available for all node types
					entry.validationErrors = [];
				}

				// Assertions
				expect(missingTypes).toEqual([]);
			} catch (err) {
				entry.roundTripStatus = 'error';
				entry.roundTripError = err instanceof Error ? err.message : String(err);
				throw err;
			} finally {
				testEntries.push(entry);
			}
		});
	}

	// Additional round-trip assertion tests (beyond fixtures)

	describe('round-trip property preservation', () => {
		it('preserves onError through round-trip', () => {
			const original: WorkflowJSON = {
				name: 'OnError Test',
				nodes: [
					{
						id: '1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: '2',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4,
						position: [200, 0],
						parameters: { url: 'https://api.example.com' },
						onError: 'continueErrorOutput',
					},
					{
						id: '3',
						name: 'Error Handler',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [400, 100],
						parameters: {},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
					},
					'HTTP Request': {
						main: [[], [{ node: 'Error Handler', type: 'main', index: 0 }]],
					},
				},
			};

			const code = generateDataFlowWorkflowCode(original);
			const parsed = parseDataFlowCode(code);
			const httpNode = parsed.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest');
			expect(httpNode?.onError).toBe('continueErrorOutput');
		});

		it('preserves credentials through round-trip', () => {
			const original: WorkflowJSON = {
				name: 'Credentials Test',
				nodes: [
					{
						id: '1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: '2',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4,
						position: [200, 0],
						parameters: { url: 'https://api.example.com' },
						credentials: {
							httpBasicAuth: { id: '1', name: 'My Auth' },
						},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
					},
				},
			};

			const code = generateDataFlowWorkflowCode(original);
			const parsed = parseDataFlowCode(code);
			const httpNode = parsed.nodes.find(
				(n) => n.type === 'n8n-nodes-base.httpRequest',
			) as NodeJSON;
			expect(httpNode?.credentials).toBeDefined();
			expect(
				(httpNode.credentials as Record<string, Record<string, string>>).httpBasicAuth.name,
			).toBe('My Auth');
		});

		it('preserves AI subnode connections through round-trip', () => {
			const original: WorkflowJSON = {
				name: 'AI Subnodes Test',
				nodes: [
					{
						id: '1',
						name: 'Chat Trigger',
						type: '@n8n/n8n-nodes-langchain.chatTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: '2',
						name: 'AI Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1,
						position: [200, 0],
						parameters: { agent: 'conversationalAgent' },
					},
					{
						id: '3',
						name: 'OpenAI Chat Model',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						typeVersion: 1,
						position: [200, 200],
						parameters: { model: 'gpt-4' },
					},
				],
				connections: {
					'Chat Trigger': {
						main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
					},
					'OpenAI Chat Model': {
						ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
					},
				},
			};

			const code = generateDataFlowWorkflowCode(original);
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
		});
	});
});
