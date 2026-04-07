/**
 * Integration tests for responder agent limitations (AI-1894)
 *
 * Tests the behavior when users ask the responder agent to perform
 * actions it cannot do (like web search), ensuring proper acknowledgment
 * of limitations and helpful alternatives.
 *
 * To run these tests:
 * ENABLE_INTEGRATION_TESTS=true N8N_AI_ANTHROPIC_KEY=your-key pnpm test:integration
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';

import { createResponderAgent, invokeResponderAgent } from '@/agents/responder.agent';
import {
	setupIntegrationLLM,
	shouldRunIntegrationTests,
} from '@/chains/test/integration/test-helpers';
import type { SimpleWorkflow } from '@/types/workflow';

describe('Responder Limitations - Integration Tests (AI-1894)', () => {
	let llm: BaseChatModel;

	// Skip all tests if integration tests are not enabled
	const skipTests = !shouldRunIntegrationTests();

	// Set default timeout for all tests in this suite
	jest.setTimeout(120000); // 2 minutes

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

		console.log('\n🚀 Setting up responder limitations integration test environment...\n');

		// Load real LLM
		llm = await setupIntegrationLLM();
	});

	describe('Web Search Limitations', () => {
		const emptyWorkflow: SimpleWorkflow = {
			nodes: [],
			connections: {},
			name: '',
		};

		it('should explain it cannot search the web when asked', async () => {
			if (skipTests) return;

			console.log('\n📝 Testing web search limitation acknowledgment...\n');

			const responderAgent = createResponderAgent({ llm });

			const { response } = await invokeResponderAgent(responderAgent, {
				messages: [
					new HumanMessage({
						content: 'Can you search the web for information about Slack API rate limits?',
					}),
				],
				coordinationLog: [],
				discoveryContext: null,
				workflowJSON: emptyWorkflow,
			});

			const messageContent =
				typeof response.content === 'string'
					? response.content.toLowerCase()
					: JSON.stringify(response.content).toLowerCase();

			console.log('Response:', response.content);

			// Should acknowledge limitation
			const acknowledgesLimitation =
				messageContent.includes('cannot') ||
				messageContent.includes("can't") ||
				messageContent.includes('unable') ||
				messageContent.includes("don't have") ||
				messageContent.includes('not able');

			const mentionsWebOrSearch =
				messageContent.includes('web') ||
				messageContent.includes('search') ||
				messageContent.includes('online') ||
				messageContent.includes('internet') ||
				messageContent.includes('browse');

			expect(acknowledgesLimitation).toBe(true);
			expect(mentionsWebOrSearch).toBe(true);

			// Should offer alternative help
			const offersAlternative =
				messageContent.includes('help') ||
				messageContent.includes('assist') ||
				messageContent.includes('workflow') ||
				messageContent.includes('build') ||
				messageContent.includes('can') ||
				messageContent.includes('however');

			expect(offersAlternative).toBe(true);
		});

		it('should offer to build workflows based on existing knowledge when web search requested', async () => {
			if (skipTests) return;

			console.log('\n📝 Testing alternative help offer when documentation lookup requested...\n');

			const responderAgent = createResponderAgent({ llm });

			const { response } = await invokeResponderAgent(responderAgent, {
				messages: [
					new HumanMessage({
						content:
							'Look up the latest documentation for the Slack node and tell me what operations are available',
					}),
				],
				coordinationLog: [],
				discoveryContext: null,
				workflowJSON: emptyWorkflow,
			});

			const messageContent =
				typeof response.content === 'string'
					? response.content.toLowerCase()
					: JSON.stringify(response.content).toLowerCase();

			console.log('Response:', response.content);

			// Should NOT claim it retrieved documentation from the web
			const claimsRetrieval =
				messageContent.includes('i found') ||
				messageContent.includes('i retrieved') ||
				messageContent.includes('according to the documentation') ||
				messageContent.includes('the documentation says');

			expect(claimsRetrieval).toBe(false);

			// Should explain limitation or offer to help with workflow building
			const providesContext =
				messageContent.includes('cannot') ||
				messageContent.includes("can't") ||
				messageContent.includes('unable') ||
				messageContent.includes('existing knowledge') ||
				messageContent.includes('help') ||
				messageContent.includes('build') ||
				messageContent.includes('workflow') ||
				messageContent.includes('slack'); // Should at least mention Slack in some helpful way

			expect(providesContext).toBe(true);
		});

		it('should redirect real-time data requests to workflow building', async () => {
			if (skipTests) return;

			console.log('\n📝 Testing redirect for real-time data requests...\n');

			const responderAgent = createResponderAgent({ llm });

			const { response } = await invokeResponderAgent(responderAgent, {
				messages: [
					new HumanMessage({
						content: 'What is the current Bitcoin price?',
					}),
				],
				coordinationLog: [],
				discoveryContext: null,
				workflowJSON: emptyWorkflow,
			});

			const messageContent =
				typeof response.content === 'string'
					? response.content.toLowerCase()
					: JSON.stringify(response.content).toLowerCase();

			console.log('Response:', response.content);

			// Should NOT provide a price (it doesn't have access to real-time data)
			const providesPrice =
				/\$[\d,]+/.test(messageContent) || /[\d,]+\s*(usd|dollars)/i.test(messageContent);
			expect(providesPrice).toBe(false);

			// Should acknowledge limitation or offer workflow alternative
			const acknowledgesOrOffers =
				messageContent.includes('cannot') ||
				messageContent.includes("can't") ||
				messageContent.includes("don't have") ||
				messageContent.includes('real-time') ||
				messageContent.includes('workflow') ||
				messageContent.includes('api') ||
				messageContent.includes('build');

			expect(acknowledgesOrOffers).toBe(true);
		});
	});
});
