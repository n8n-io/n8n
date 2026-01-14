/**
 * Integration tests for multi-agent error handling (AI-1812)
 *
 * Tests the behavior when subgraphs hit recursion limits or other errors,
 * ensuring proper user-facing messages and continuation capabilities.
 *
 * To run these tests:
 * ENABLE_INTEGRATION_TESTS=true N8N_AI_ANTHROPIC_KEY=your-key pnpm test:integration
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import type { INodeTypeDescription } from 'n8n-workflow';

import { ResponderAgent } from '@/agents/responder.agent';
import {
	setupIntegrationLLM,
	shouldRunIntegrationTests,
} from '@/chains/test/integration/test-helpers';
import { createMultiAgentWorkflowWithSubgraphs } from '@/multi-agent-workflow-subgraphs';
import type { CoordinationLogEntry } from '@/types/coordination';
import { createErrorMetadata } from '@/types/coordination';
import type { SimpleWorkflow } from '@/types/workflow';
import { determineStateAction, handleClearErrorState } from '@/utils/state-modifier';

import { loadNodesFromFile } from '../../../../evaluations/support/load-nodes';

describe('Multi-Agent Error Handling - Integration Tests (AI-1812)', () => {
	let llm: BaseChatModel;
	let parsedNodeTypes: INodeTypeDescription[];
	let mockLogger: Logger;

	// Skip all tests if integration tests are not enabled
	const skipTests = !shouldRunIntegrationTests();

	// Set default timeout for all tests in this suite (errors can take time)
	jest.setTimeout(180000); // 3 minutes

	beforeAll(async () => {
		// Override console.log to use process.stdout directly
		jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
			process.stdout.write(args.map(String).join(' ') + '\n');
		});

		if (skipTests) {
			console.log(
				'\n⏭️  Skipping integration tests. Set ENABLE_INTEGRATION_TESTS=true to run them.\n',
			);
			return;
		}

		console.log('\n🚀 Setting up multi-agent error handling integration test environment...\n');

		// Load real LLM and node types
		llm = await setupIntegrationLLM();
		parsedNodeTypes = loadNodesFromFile();
		mockLogger = mock<Logger>();

		console.log(`Loaded ${parsedNodeTypes.length} node types for testing\n`);
	});

	describe('Responder Error Messages', () => {
		it('should provide helpful message when recursion error occurs with partial workflow', async () => {
			if (skipTests) return;

			// Create a workflow with some nodes (simulating partial success)
			const partialWorkflow: SimpleWorkflow = {
				nodes: [
					{
						id: 'node-1',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4.2,
						position: [250, 300] as [number, number],
						parameters: {},
					},
					{
						id: 'node-2',
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 3.4,
						position: [450, 300] as [number, number],
						parameters: {},
					},
				],
				connections: {
					'HTTP Request': {
						main: [[{ node: 'Set', type: 'main', index: 0 }]],
					},
				},
				name: 'Test Workflow',
			};

			// Simulate a recursion error in the builder phase
			const errorLog: CoordinationLogEntry[] = [
				{
					phase: 'builder',
					status: 'error',
					timestamp: Date.now(),
					summary: 'Error: GraphRecursionError: Recursion limit exceeded',
					metadata: createErrorMetadata({
						failedSubgraph: 'builder',
						errorMessage: 'GraphRecursionError: Recursion limit exceeded',
					}),
				},
			];

			// Don't use checkpointer for this test - we're just testing error message
			const graph = createMultiAgentWorkflowWithSubgraphs({
				parsedNodeTypes,
				llmSimpleTask: llm,
				llmComplexTask: llm,
				logger: mockLogger,
			});

			// Invoke graph with error state, forcing it to go directly to responder
			const result = await graph.invoke({
				messages: [new HumanMessage({ content: 'Build a data scraper workflow' })],
				workflowJSON: partialWorkflow,
				coordinationLog: errorLog,
				nextPhase: 'responder',
			});

			// Verify responder generated a message
			expect(result.messages.length).toBeGreaterThan(0);
			const lastMessage = result.messages[result.messages.length - 1];
			const messageContent =
				typeof lastMessage.content === 'string'
					? lastMessage.content.toLowerCase()
					: JSON.stringify(lastMessage.content).toLowerCase();

			// When workflow exists after recursion error,
			// should acknowledge it was created and avoid "apologize and tell user to build manually"
			// Should NOT confuse user by saying it failed when workflow exists
			expect(messageContent).not.toContain('apologize');
			expect(messageContent).not.toContain('build it manually');
			expect(messageContent).not.toContain('could not build');
			expect(messageContent).not.toContain('failed to create');
		});

		it('should provide different message when recursion error occurs with no workflow', async () => {
			if (skipTests) return;

			console.log('\n📝 Testing recursion error with empty workflow (direct responder test)...\n');

			// Empty workflow (simulating complete failure before any nodes created)
			const emptyWorkflow: SimpleWorkflow = {
				nodes: [],
				connections: {},
				name: '',
			};

			// Simulate recursion error in discovery phase (early failure)
			const errorLog: CoordinationLogEntry[] = [
				{
					phase: 'discovery',
					status: 'error',
					timestamp: Date.now(),
					summary: 'Error: GraphRecursionError: Recursion limit exceeded',
					metadata: createErrorMetadata({
						failedSubgraph: 'discovery',
						errorMessage: 'GraphRecursionError: Recursion limit exceeded',
					}),
				},
			];

			// Test responder agent directly instead of full graph
			const responderAgent = new ResponderAgent({ llm });

			const response = await responderAgent.invoke({
				messages: [
					new HumanMessage({
						content:
							'Build a complex multi-agent workflow with 10 AI agents that scrape the web recursively',
					}),
				],
				coordinationLog: errorLog,
				discoveryContext: null,
				workflowJSON: emptyWorkflow,
			});

			const messageContent =
				typeof response.content === 'string'
					? response.content.toLowerCase()
					: JSON.stringify(response.content).toLowerCase();

			// When no workflow exists,
			// should suggest options for "fixing the complexity"
			// Should provide actionable guidance, not just apologize
			const hasSuggestions =
				messageContent.includes('simpl') || // simplify/simpler
				messageContent.includes('break') || // break down
				messageContent.includes('step') || // steps
				messageContent.includes('try') || // try a different approach
				messageContent.includes('instead'); // do X instead

			expect(hasSuggestions).toBe(true);
		});
	});

	describe('Error State Cleanup', () => {
		it('should trigger error clearing when new message arrives with errors in log', () => {
			// Test the state action determination logic directly
			const errorLog: CoordinationLogEntry[] = [
				{
					phase: 'builder',
					status: 'error',
					timestamp: Date.now(),
					summary: 'Error: GraphRecursionError: Recursion limit exceeded',
					metadata: createErrorMetadata({
						failedSubgraph: 'builder',
						errorMessage: 'GraphRecursionError: Recursion limit exceeded',
					}),
				},
			];

			const workflow: SimpleWorkflow = {
				nodes: [],
				connections: {},
				name: 'Test Workflow', // Give it a name to avoid triggering create_workflow_name
			};

			// First check: Should trigger clear_error_state when errors exist
			const action1 = determineStateAction(
				{
					messages: [new HumanMessage({ content: 'Continue please' })],
					workflowJSON: workflow,
					coordinationLog: errorLog,
				},
				10000,
			);

			expect(action1).toBe('clear_error_state');

			// Simulate clearing errors - adds marker entry
			const clearedResult = handleClearErrorState(errorLog, mockLogger);
			const logAfterClear = [...errorLog, ...clearedResult.coordinationLog];

			// Second check: Should NOT trigger again when clear marker exists
			const action2 = determineStateAction(
				{
					messages: [new HumanMessage({ content: 'Continue please' })],
					workflowJSON: workflow,
					coordinationLog: logAfterClear,
				},
				10000,
			);

			expect(action2).not.toBe('clear_error_state');
			expect(action2).toBe('continue'); // Should continue normally

			// Verify clear marker was added
			const hasClearMarker = logAfterClear.some(
				(e) =>
					e.phase === 'state_management' &&
					e.summary.includes('Cleared') &&
					e.summary.includes('error'),
			);
			expect(hasClearMarker).toBe(true);
		});
	});
});
