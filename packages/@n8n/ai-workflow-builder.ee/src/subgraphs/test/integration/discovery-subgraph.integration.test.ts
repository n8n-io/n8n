import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { isAIMessage } from '@langchain/core/messages';
import type { INodeTypeDescription } from 'n8n-workflow';

import {
	setupIntegrationLLM,
	shouldRunIntegrationTests,
} from '@/chains/test/integration/test-helpers';
import { DiscoverySubgraph } from '@/subgraphs/discovery.subgraph';
import type { WorkflowTechniqueType } from '@/types/categorization';

import techniqueTestData from './techniques.json';
import { loadNodesFromFile } from '../../../../evaluations/support/load-nodes';

/**
 * Integration tests for Discovery Subgraph
 *
 * These tests use a real LLM and make actual API calls to verify end-to-end discovery behavior.
 * They are skipped by default and only run when ENABLE_INTEGRATION_TESTS=true
 *
 * To run these tests:
 * ENABLE_INTEGRATION_TESTS=true N8N_AI_ANTHROPIC_KEY=your-key pnpm test discovery-subgraph.integration
 */

// Test prompts covering different workflow types
const testPrompts = [
	{
		name: 'Monitoring workflow',
		prompt:
			'Create a workflow that monitors my website every 5 minutes and sends me a Slack notification if it goes down',
		expectedNodes: ['n8n-nodes-base.httpRequest', 'n8n-nodes-base.scheduleTrigger'],
		minNodes: 2,
	},
	{
		name: 'Form input workflow',
		prompt:
			'Set up a form to collect customer feedback, analyze sentiment with AI, and store the results in Airtable',
		expectedNodes: ['n8n-nodes-base.formTrigger'],
		minNodes: 3,
	},
	{
		name: 'RAG chatbot workflow',
		prompt:
			'Build a chatbot that can answer customer questions using information from our knowledge base with RAG',
		expectedNodes: [
			'@n8n/n8n-nodes-langchain.chatTrigger',
			'@n8n/n8n-nodes-langchain.agent',
			'@n8n/n8n-nodes-langchain.vectorStore',
		],
		minNodes: 4,
	},
	{
		name: 'API integration workflow',
		prompt: 'Fetch weather data from OpenWeatherMap API and send daily forecast email via Gmail',
		expectedNodes: ['n8n-nodes-base.httpRequest', 'n8n-nodes-base.gmail'],
		minNodes: 2,
	},
	{
		name: 'Data transformation workflow',
		prompt: 'Read CSV file, transform data with JavaScript, and upload to Google Sheets',
		expectedNodes: ['n8n-nodes-base.readBinaryFile', 'n8n-nodes-base.code'],
		minNodes: 3,
	},
	{
		name: 'Multi-agent AI workflow',
		prompt:
			'Create 4 AI agents (research, fact-check, writer, formatter) that work together to create and send weekly newsletter',
		expectedNodes: ['@n8n/n8n-nodes-langchain.agent', '@n8n/n8n-nodes-langchain.lmChatAnthropic'],
		minNodes: 5,
	},
	{
		name: 'Webhook workflow',
		prompt: 'Receive webhook from Stripe, validate payment, and update customer record in database',
		expectedNodes: ['n8n-nodes-base.webhook'],
		minNodes: 2,
	},
	{
		name: 'Scheduled scraping',
		prompt: 'Scrape competitor pricing daily and save to Notion database',
		expectedNodes: ['n8n-nodes-base.scheduleTrigger', 'n8n-nodes-base.httpRequest'],
		minNodes: 2,
	},
];

// Test prompts for technique categorization loaded from JSON file
const techniqueTestPrompts = techniqueTestData as Array<{
	prompt: string;
	expectedTechniques: WorkflowTechniqueType[];
}>;

// Helper to check if expected nodes are discovered
function hasExpectedNodes(
	discovered: Array<{ nodeName: string; version: number; reasoning: string }>,
	expectedNames: string[],
): { hasAll: boolean; missing: string[] } {
	const discoveredNames = discovered.map((n) => n.nodeName);
	const missing = expectedNames.filter((name) => !discoveredNames.includes(name));
	return {
		hasAll: missing.length === 0,
		missing,
	};
}

// Helper to calculate node discovery frequency
function calculateNodeFrequency(
	results: Array<{ nodesFound: Array<{ nodeName: string }> }>,
): Map<string, number> {
	const frequency = new Map<string, number>();
	for (const result of results) {
		for (const { nodeName } of result.nodesFound) {
			frequency.set(nodeName, (frequency.get(nodeName) ?? 0) + 1);
		}
	}
	return frequency;
}

// Helper to extract techniques from get_best_practices tool call in messages
function extractTechniquesFromMessages(messages: BaseMessage[]): WorkflowTechniqueType[] {
	for (const msg of messages) {
		if (isAIMessage(msg) && msg.tool_calls) {
			const bestPracticesCall = msg.tool_calls.find((tc) => tc.name === 'get_best_practices');
			if (bestPracticesCall?.args?.techniques) {
				return bestPracticesCall.args.techniques as WorkflowTechniqueType[];
			}
		}
	}
	return [];
}

// Helper to check if expected techniques are present
function hasExpectedTechniques(
	result: WorkflowTechniqueType[],
	expected: WorkflowTechniqueType[],
): { hasAll: boolean; missing: WorkflowTechniqueType[] } {
	const missing = expected.filter((tech) => !result.includes(tech));
	return {
		hasAll: missing.length === 0,
		missing,
	};
}

// Helper to calculate technique frequency
function calculateTechniqueFrequency(
	results: Array<{ techniques: WorkflowTechniqueType[] }>,
): Map<WorkflowTechniqueType, number> {
	const frequency = new Map<WorkflowTechniqueType, number>();
	for (const result of results) {
		for (const technique of result.techniques) {
			frequency.set(technique, (frequency.get(technique) ?? 0) + 1);
		}
	}
	return frequency;
}

describe('Discovery Subgraph - Integration Tests', () => {
	let llm: BaseChatModel;
	let parsedNodeTypes: INodeTypeDescription[];
	let discoverySubgraph: DiscoverySubgraph;

	// Skip all tests if integration tests are not enabled
	const skipTests = !shouldRunIntegrationTests();

	// Set default timeout for all tests in this suite
	jest.setTimeout(1800000); // 30 minutes

	beforeAll(async () => {
		// Override console.log to use process.stdout directly, bypassing Jest's
		// verbose wrapper that adds stack traces to every log line
		jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
			process.stdout.write(args.map(String).join(' ') + '\n');
		});

		if (skipTests) {
			console.log(
				'\n⏭️  Skipping integration tests. Set ENABLE_INTEGRATION_TESTS=true to run them.\n',
			);
			return;
		}

		console.log('\n🚀 Setting up discovery subgraph integration test environment...\n');

		// Load real LLM and node types
		llm = await setupIntegrationLLM();
		parsedNodeTypes = loadNodesFromFile();

		console.log(`Loaded ${parsedNodeTypes.length} node types for testing\n`);

		// Create discovery subgraph instance
		discoverySubgraph = new DiscoverySubgraph();
	});

	describe('Basic Discovery', () => {
		it('should discover nodes for simple monitoring workflow', async () => {
			if (skipTests) return;

			const compiled = discoverySubgraph.create({ parsedNodeTypes, llm });
			const result = await compiled.invoke({
				userRequest: 'Monitor my website every 5 minutes and send Slack alert if it goes down',
				messages: [],
			});

			expect(result.nodesFound).toBeDefined();
			expect(result.nodesFound.length).toBeGreaterThan(0);

			// Validate connectionChangingParameters are present
			expect(Array.isArray(result.nodesFound)).toBe(true);
			result.nodesFound.forEach((node) => {
				expect(node.connectionChangingParameters).toBeDefined();
				expect(Array.isArray(node.connectionChangingParameters)).toBe(true);
			});

			// Should find scheduling and HTTP nodes
			const nodeNames = result.nodesFound.map((n) => n.nodeName);
			expect(nodeNames.some((name) => name.includes('schedule'))).toBe(true);
		});

		it('should discover nodes for form input workflow', async () => {
			if (skipTests) return;

			const compiled = discoverySubgraph.create({ parsedNodeTypes, llm });
			const result = await compiled.invoke({
				userRequest: 'Create a form to collect feedback and store in database',
				messages: [],
			});

			expect(result.nodesFound).toBeDefined();
			expect(result.nodesFound.length).toBeGreaterThan(0);

			// Should find form trigger
			const nodeNames = result.nodesFound.map((n) => n.nodeName);
			expect(nodeNames.some((name) => name.includes('form'))).toBe(true);
		});

		it('should discover nodes for AI/RAG workflow', async () => {
			if (skipTests) return;

			const compiled = discoverySubgraph.create({ parsedNodeTypes, llm });
			const result = await compiled.invoke({
				userRequest: 'Build a chatbot with RAG using knowledge base documents',
				messages: [],
			});

			expect(result.nodesFound).toBeDefined();
			expect(result.nodesFound.length).toBeGreaterThanOrEqual(3);

			// Should find AI-related nodes
			const nodeNames = result.nodesFound.map((n) => n.nodeName);
			const hasAINodes = nodeNames.some(
				(name) => name.includes('langchain') || name.includes('openai'),
			);
			expect(hasAINodes).toBe(true);
		});
	});

	describe('Output Structure Validation', () => {
		it('should return all required discovery fields', async () => {
			if (skipTests) return;

			const compiled = discoverySubgraph.create({ parsedNodeTypes, llm });
			const result = await compiled.invoke({
				userRequest: 'Send daily email with weather forecast',
				messages: [],
			});

			// Validate structure
			expect(result.nodesFound).toBeDefined();
			expect(Array.isArray(result.nodesFound)).toBe(true);

			// Validate each node has required fields
			result.nodesFound.forEach((node) => {
				expect(node.nodeName).toBeDefined();
				expect(typeof node.nodeName).toBe('string');
				expect(node.version).toBeDefined();
				expect(typeof node.version).toBe('number');
				expect(node.reasoning).toBeDefined();
				expect(node.connectionChangingParameters).toBeDefined();
				expect(Array.isArray(node.connectionChangingParameters)).toBe(true);
			});
		});

		it('should provide reasoning for each discovered node', async () => {
			if (skipTests) return;

			const compiled = discoverySubgraph.create({ parsedNodeTypes, llm });
			const result = await compiled.invoke({
				userRequest: 'Create webhook to receive data and store in PostgreSQL',
				messages: [],
			});

			expect(result.nodesFound.length).toBeGreaterThan(0);

			// Each node should have nodeName, version, reasoning, and connectionChangingParameters
			result.nodesFound.forEach(
				({ nodeName, version, reasoning, connectionChangingParameters }) => {
					expect(nodeName).toBeDefined();
					expect(typeof nodeName).toBe('string');
					expect(version).toBeDefined();
					expect(typeof version).toBe('number');
					expect(reasoning).toBeDefined();
					expect(reasoning.length).toBeGreaterThan(10);
					expect(connectionChangingParameters).toBeDefined();
					expect(Array.isArray(connectionChangingParameters)).toBe(true);

					// Validate structure of connection-changing parameters
					connectionChangingParameters.forEach((param) => {
						expect(param.name).toBeDefined();
						expect(typeof param.name).toBe('string');
						expect(param.possibleValues).toBeDefined();
						expect(Array.isArray(param.possibleValues)).toBe(true);
					});
				},
			);
		});

		it('should include categorization and best practices in internal state', async () => {
			if (skipTests) return;

			const compiled = discoverySubgraph.create({ parsedNodeTypes, llm });
			const result = await compiled.invoke({
				userRequest: 'Automate invoice processing with AI',
				messages: [],
			});

			expect(result.bestPractices).toBeDefined();

			expect(result.nodesFound).toBeDefined();
			expect(Array.isArray(result.nodesFound)).toBe(true);
		});
	});

	describe('Complex Workflows', () => {
		it('should discover multiple nodes for multi-step workflow', async () => {
			if (skipTests) return;

			const compiled = discoverySubgraph.create({ parsedNodeTypes, llm });
			const result = await compiled.invoke({
				userRequest: 'Scrape competitor data, analyze with AI, generate report, and send via email',
				messages: [],
			});

			expect(result.nodesFound).toBeDefined();
			expect(result.nodesFound.length).toBeGreaterThanOrEqual(4);
		});
	});

	describe('Edge Cases', () => {
		it('should handle vague prompts gracefully', async () => {
			if (skipTests) return;

			const compiled = discoverySubgraph.create({ parsedNodeTypes, llm });
			const result = await compiled.invoke({
				userRequest: 'Automate my workflow',
				messages: [],
			});

			// Should still return structured output even for vague prompts
			expect(result.nodesFound).toBeDefined();
			expect(Array.isArray(result.nodesFound)).toBe(true);
		});

		it('should handle prompts with explicit node names', async () => {
			if (skipTests) return;

			const compiled = discoverySubgraph.create({ parsedNodeTypes, llm });
			const result = await compiled.invoke({
				userRequest: 'Use HTTP Request node to call an API and Code node to transform the response',
				messages: [],
			});

			expect(result.nodesFound).toBeDefined();
			const nodeNames = result.nodesFound.map((n) => n.nodeName);
			expect(nodeNames.some((name) => name.includes('httpRequest'))).toBe(true);
			expect(nodeNames.some((name) => name.includes('code'))).toBe(true);
		});
	});

	describe('Comprehensive Test Suite', () => {
		it('should discover nodes for all test prompts and display statistics', async () => {
			if (skipTests) return;

			console.log('\n📊 Running comprehensive discovery test suite...\n');

			const results: Array<{
				name: string;
				prompt: string;
				nodesFound: Array<{
					nodeName: string;
					version: number;
					reasoning: string;
					connectionChangingParameters: Array<{
						name: string;
						possibleValues: Array<string | boolean | number>;
					}>;
				}>;
				nodeCount: number;
				expectedMatch: boolean;
				missing: string[];
			}> = [];

			// Run all test prompts
			for (const test of testPrompts) {
				const compiled = discoverySubgraph.create({ parsedNodeTypes, llm });
				const result = await compiled.invoke({
					userRequest: test.prompt,
					messages: [],
				});

				const check = hasExpectedNodes(result.nodesFound, test.expectedNodes);

				results.push({
					name: test.name,
					prompt: test.prompt,
					nodesFound: result.nodesFound,
					nodeCount: result.nodesFound.length,
					expectedMatch: check.hasAll,
					missing: check.missing,
				});

				// Log individual result
				console.log(`✓ ${test.name}`);
				console.log(`  Nodes discovered: ${result.nodesFound.length}`);
				console.log(`  Node types: ${result.nodesFound.map((n) => n.nodeName).join(', ')}`);
				if (!check.hasAll) {
					console.log(`  ⚠️  Missing expected: ${check.missing.join(', ')}`);
				}
				console.log('');
			}

			// Calculate and display statistics
			const frequency = calculateNodeFrequency(results);
			const sortedFrequency = Array.from(frequency.entries())
				.sort((a, b) => b[1] - a[1])
				.slice(0, 15); // Top 15

			console.log('\n📈 Top Discovered Nodes:');
			console.log('─'.repeat(70));
			for (const [nodeName, count] of sortedFrequency) {
				const percentage = ((count / results.length) * 100).toFixed(1);
				const nodeDisplayName =
					parsedNodeTypes.find((n) => n.name === nodeName)?.displayName ?? nodeName;
				console.log(`  ${nodeDisplayName.padEnd(35)} ${count} (${percentage}%)`);
			}
			console.log('');

			// Calculate match rate
			const matchCount = results.filter((r) => r.expectedMatch).length;
			const matchRate = (matchCount / results.length) * 100;
			console.log(`✓ Expected node match rate: ${matchRate.toFixed(1)}%`);
			console.log(`  ${matchCount}/${results.length} prompts found all expected nodes\n`);

			// Calculate average nodes discovered
			const avgNodes = results.reduce((sum, r) => sum + r.nodeCount, 0) / results.length;
			console.log(`📊 Average nodes discovered per prompt: ${avgNodes.toFixed(1)}\n`);

			// All results should have valid structure
			for (const result of results) {
				expect(result.nodesFound.length).toBeGreaterThanOrEqual(1);
				expect(result.nodesFound.length).toBeLessThanOrEqual(20); // Sanity check
			}

			// At least 70% should match expected nodes (allowing for LLM variation)
			expect(matchRate).toBeGreaterThanOrEqual(70);
		});
	});

	describe('Technique Categorization (parity with promptCategorizationChain)', () => {
		const PARALLEL_BATCH_SIZE = 30;

		it('should select correct techniques via get_best_practices for all test prompts', async () => {
			if (skipTests) return;

			console.log(
				`\n📊 Running technique categorization test suite (${techniqueTestPrompts.length} prompts, ${PARALLEL_BATCH_SIZE} parallel)...\n`,
			);

			type TestResult = {
				index: number;
				prompt: string;
				techniques: WorkflowTechniqueType[];
				expectedTechniques: WorkflowTechniqueType[];
				expectedMatch: boolean;
				missing: WorkflowTechniqueType[];
			};

			// Process a single prompt
			const processPrompt = async (
				test: (typeof techniqueTestPrompts)[number],
				index: number,
			): Promise<TestResult> => {
				const compiled = discoverySubgraph.create({ parsedNodeTypes, llm });
				const result = await compiled.invoke({
					userRequest: test.prompt,
					messages: [],
				});

				const techniques = extractTechniquesFromMessages(result.messages);
				const check = hasExpectedTechniques(techniques, test.expectedTechniques);

				return {
					index,
					prompt: test.prompt,
					techniques,
					expectedTechniques: test.expectedTechniques,
					expectedMatch: check.hasAll,
					missing: check.missing,
				};
			};

			// Process prompts in parallel batches
			const allResults: TestResult[] = [];
			for (
				let batchStart = 0;
				batchStart < techniqueTestPrompts.length;
				batchStart += PARALLEL_BATCH_SIZE
			) {
				const batchEnd = Math.min(batchStart + PARALLEL_BATCH_SIZE, techniqueTestPrompts.length);
				const batch = techniqueTestPrompts.slice(batchStart, batchEnd);

				console.log(
					`Processing batch ${Math.floor(batchStart / PARALLEL_BATCH_SIZE) + 1}/${Math.ceil(techniqueTestPrompts.length / PARALLEL_BATCH_SIZE)} (prompts ${batchStart + 1}-${batchEnd})...`,
				);

				const batchResults = await Promise.all(
					batch.map(async (test, i) => await processPrompt(test, batchStart + i)),
				);

				// Log results for this batch
				for (const result of batchResults) {
					const truncatedPrompt =
						result.prompt.length > 80 ? `${result.prompt.substring(0, 80)}...` : result.prompt;
					const status = result.expectedMatch ? '✓' : '⚠️';
					console.log(
						`${status} [${result.index + 1}/${techniqueTestPrompts.length}] ${truncatedPrompt}`,
					);
					console.log(`    Techniques: ${result.techniques.join(', ') || '(none)'}`);
					console.log(`    Expected: ${result.expectedTechniques.join(', ')}`);
					if (!result.expectedMatch) {
						console.log(`    Missing: ${result.missing.join(', ')}`);
					}
				}
				console.log('');

				allResults.push(...batchResults);
			}

			// Calculate and display statistics
			const frequency = calculateTechniqueFrequency(allResults);
			const sortedFrequency = Array.from(frequency.entries()).sort((a, b) => b[1] - a[1]);

			console.log('\n📈 Technique Frequency:');
			console.log('─'.repeat(60));
			for (const [technique, count] of sortedFrequency) {
				const percentage = ((count / allResults.length) * 100).toFixed(1);
				console.log(`  ${technique.padEnd(30)} ${count} (${percentage}%)`);
			}
			console.log('');

			// Calculate match rate (individual techniques matched / total expected)
			const totalExpectedTechniques = allResults.reduce(
				(sum, r) => sum + r.expectedTechniques.length,
				0,
			);
			const totalMatchedTechniques = allResults.reduce(
				(sum, r) => sum + (r.expectedTechniques.length - r.missing.length),
				0,
			);
			const techniqueMatchRate = (totalMatchedTechniques / totalExpectedTechniques) * 100;

			// Calculate prompt-level match rates
			const PARTIAL_MATCH_THRESHOLD = 0.5; // 50% of expected techniques = acceptable
			const fullMatchCount = allResults.filter((r) => r.expectedMatch).length;
			const acceptableMatchCount = allResults.filter((r) => {
				const matched = r.expectedTechniques.length - r.missing.length;
				const matchRatio = matched / r.expectedTechniques.length;
				return matchRatio >= PARTIAL_MATCH_THRESHOLD;
			}).length;

			const fullMatchRate = (fullMatchCount / allResults.length) * 100;
			const acceptableMatchRate = (acceptableMatchCount / allResults.length) * 100;

			console.log(`✓ Technique match rate: ${techniqueMatchRate.toFixed(1)}%`);
			console.log(
				`  ${totalMatchedTechniques}/${totalExpectedTechniques} individual techniques matched\n`,
			);
			console.log(`✓ Acceptable match rate (≥50% of expected): ${acceptableMatchRate.toFixed(1)}%`);
			console.log(
				`  ${acceptableMatchCount}/${allResults.length} prompts matched at least half of expected techniques\n`,
			);
			console.log(`✓ Full match rate (100% of expected): ${fullMatchRate.toFixed(1)}%`);
			console.log(
				`  ${fullMatchCount}/${allResults.length} prompts matched all expected techniques\n`,
			);

			// All results should have techniques (discovery should call get_best_practices)
			for (const result of allResults) {
				expect(result.techniques.length).toBeGreaterThan(0);
			}

			// At least 80% of prompts should have acceptable matches (≥50% of expected techniques)
			expect(acceptableMatchRate).toBeGreaterThanOrEqual(80);
		});
	});
});
