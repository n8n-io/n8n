import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Command, MemorySaver } from '@langchain/langgraph';
import type { INodeTypeDescription } from 'n8n-workflow';

import {
	setupIntegrationLLM,
	shouldRunIntegrationTests,
} from '@/chains/test/integration/test-helpers';
import { DiscoverySubgraph } from '@/subgraphs/discovery.subgraph';
import type { PlanOutput } from '@/types/planning';

import { loadNodesFromFile } from '../../../../evaluations/support/load-nodes';

/**
 * Integration tests for Plan Mode in the Discovery Subgraph
 *
 * Tests the full plan mode lifecycle: discovery → plan → approve/modify/reject
 * using a real LLM with interrupt/resume via MemorySaver checkpointer.
 *
 * To run:
 * ENABLE_INTEGRATION_TESTS=true N8N_AI_ANTHROPIC_KEY=your-key pnpm jest plan-mode-discovery.integration
 */

const skipTests = !shouldRunIntegrationTests();

// Unique thread ID per test to avoid state collisions
let threadCounter = 0;
function nextThreadId() {
	return `plan-test-${Date.now()}-${++threadCounter}`;
}

interface InterruptInfo {
	type: string;
	plan?: PlanOutput;
	questions?: unknown[];
	introMessage?: string;
}

/**
 * Invoke the discovery subgraph and return the result + any interrupt info.
 * When the graph hits an interrupt (plan or questions), invoke() returns
 * the partial state. We use getState() to extract the interrupt value.
 */
async function invokeAndGetInterrupt(
	graph: ReturnType<DiscoverySubgraph['create']>,
	input: Record<string, unknown>,
	threadId: string,
): Promise<{ result: Record<string, unknown>; interrupt?: InterruptInfo }> {
	const config = { configurable: { thread_id: threadId } };
	const result = await graph.invoke(input, config);

	// Check if the graph paused at an interrupt
	const state = await graph.getState(config);
	const interruptData = state.tasks?.[0]?.interrupts?.[0];

	if (interruptData?.value) {
		return { result, interrupt: interruptData.value as InterruptInfo };
	}

	return { result };
}

/**
 * Resume the graph after an interrupt with the given value.
 */
async function resumeWithValue(
	graph: ReturnType<DiscoverySubgraph['create']>,
	resumeValue: unknown,
	threadId: string,
): Promise<{ result: Record<string, unknown>; interrupt?: InterruptInfo }> {
	const config = { configurable: { thread_id: threadId } };
	const result = await graph.invoke(new Command({ resume: resumeValue }), config);

	const state = await graph.getState(config);
	const interruptData = state.tasks?.[0]?.interrupts?.[0];

	if (interruptData?.value) {
		return { result, interrupt: interruptData.value as InterruptInfo };
	}

	return { result };
}

describe('Plan Mode Discovery - Integration Tests', () => {
	let llm: BaseChatModel;
	let parsedNodeTypes: INodeTypeDescription[];
	let discoverySubgraph: DiscoverySubgraph;

	jest.setTimeout(300_000); // 5 minutes per test

	beforeAll(async () => {
		jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
			process.stdout.write(args.map(String).join(' ') + '\n');
		});

		if (skipTests) {
			console.log(
				'\n⏭️  Skipping plan mode integration tests. Set ENABLE_INTEGRATION_TESTS=true to run.\n',
			);
			return;
		}

		console.log('\n🚀 Setting up plan mode integration test environment...\n');

		llm = await setupIntegrationLLM();
		parsedNodeTypes = loadNodesFromFile();
		discoverySubgraph = new DiscoverySubgraph();

		console.log(`Loaded ${parsedNodeTypes.length} node types\n`);
	});

	function createPlanModeGraph() {
		return discoverySubgraph.create({
			parsedNodeTypes,
			llm,
			plannerLLM: llm,
			featureFlags: { planMode: true },
			checkpointer: new MemorySaver(),
		});
	}

	function makePlanInput(userRequest: string) {
		return {
			userRequest,
			workflowJSON: { nodes: [], connections: {}, name: '' },
			mode: 'plan' as const,
			planOutput: null,
			planFeedback: null,
			planPrevious: null,
		};
	}

	describe('Discovery → Plan → Approve', () => {
		it('should discover nodes, generate a plan, and approve it', async () => {
			if (skipTests) return;

			const graph = createPlanModeGraph();
			const threadId = nextThreadId();

			console.log('Step 1: Invoke with plan mode...');
			const { interrupt } = await invokeAndGetInterrupt(
				graph,
				makePlanInput('Send weather alerts via Slack every morning at 7am'),
				threadId,
			);

			// The graph should have interrupted — either with questions or a plan.
			// If questions: answer them, then expect plan. If plan: proceed to approve.
			let planInterrupt = interrupt;

			if (planInterrupt?.type === 'questions') {
				console.log(
					`Got questions interrupt (${planInterrupt.questions?.length} questions). Answering...`,
				);

				// Build simple answers
				const answers = (planInterrupt.questions as Array<{ id: string; question: string }>).map(
					(q) => ({
						questionId: q.id,
						question: q.question,
						selectedOptions: ['Yes'],
						skipped: false,
					}),
				);

				const { interrupt: afterAnswers } = await resumeWithValue(graph, answers, threadId);
				planInterrupt = afterAnswers;
			}

			// Now we should have a plan interrupt
			expect(planInterrupt).toBeDefined();
			expect(planInterrupt!.type).toBe('plan');
			expect(planInterrupt!.plan).toBeDefined();

			const plan = planInterrupt!.plan!;
			console.log(`Got plan: "${plan.summary}"`);
			console.log(`  Trigger: ${plan.trigger}`);
			console.log(`  Steps: ${plan.steps.length}`);
			plan.steps.forEach((s, i) => console.log(`    ${i + 1}. ${s.description}`));

			// Validate plan structure
			expect(plan.summary.length).toBeGreaterThan(10);
			expect(plan.trigger.length).toBeGreaterThan(0);
			expect(plan.steps.length).toBeGreaterThanOrEqual(1);

			// Step 2: Approve the plan
			console.log('\nStep 2: Approving plan...');
			const { result: approvedResult } = await resumeWithValue(
				graph,
				{ action: 'approve' },
				threadId,
			);

			expect(approvedResult.planDecision).toBe('approve');
			expect(approvedResult.planOutput).toBeDefined();
			expect(approvedResult.mode).toBe('build');

			console.log('✅ Plan approved successfully\n');
		});
	});

	describe('Discovery → Plan → Modify → New Plan → Approve', () => {
		it('should modify a plan based on user feedback and generate a new one', async () => {
			if (skipTests) return;

			const graph = createPlanModeGraph();
			const threadId = nextThreadId();

			console.log('Step 1: Get initial plan...');
			let { interrupt } = await invokeAndGetInterrupt(
				graph,
				makePlanInput('Create a workflow that monitors a website and sends email alerts'),
				threadId,
			);

			// Handle potential questions
			if (interrupt?.type === 'questions') {
				const answers = (interrupt.questions as Array<{ id: string; question: string }>).map(
					(q) => ({
						questionId: q.id,
						question: q.question,
						selectedOptions: ['Every 5 minutes'],
						skipped: false,
					}),
				);
				({ interrupt } = await resumeWithValue(graph, answers, threadId));
			}

			expect(interrupt?.type).toBe('plan');
			const firstPlan = interrupt!.plan!;
			console.log(`Initial plan: "${firstPlan.summary}"`);

			// Step 2: Request modification
			console.log('\nStep 2: Requesting plan modification...');
			const { interrupt: modifiedInterrupt } = await resumeWithValue(
				graph,
				{ action: 'modify', feedback: 'Also add error handling — retry 3 times before alerting' },
				threadId,
			);

			// Handle potential questions in the modify loop
			let finalInterrupt = modifiedInterrupt;
			if (finalInterrupt?.type === 'questions') {
				const answers = (finalInterrupt.questions as Array<{ id: string; question: string }>).map(
					(q) => ({
						questionId: q.id,
						question: q.question,
						selectedOptions: ['Yes'],
						skipped: false,
					}),
				);
				({ interrupt: finalInterrupt } = await resumeWithValue(graph, answers, threadId));
			}

			expect(finalInterrupt?.type).toBe('plan');
			const modifiedPlan = finalInterrupt!.plan!;
			console.log(`Modified plan: "${modifiedPlan.summary}"`);
			console.log(`  Steps: ${modifiedPlan.steps.length}`);

			// Step 3: Approve the modified plan
			console.log('\nStep 3: Approving modified plan...');
			const { result } = await resumeWithValue(graph, { action: 'approve' }, threadId);

			expect(result.planDecision).toBe('approve');
			expect(result.planOutput).toBeDefined();

			console.log('✅ Modified plan approved\n');
		});
	});

	describe('Discovery → Plan → Reject', () => {
		it('should reject a plan and return null output', async () => {
			if (skipTests) return;

			const graph = createPlanModeGraph();
			const threadId = nextThreadId();

			console.log('Step 1: Get plan...');
			let { interrupt } = await invokeAndGetInterrupt(
				graph,
				makePlanInput('Build a simple webhook responder'),
				threadId,
			);

			if (interrupt?.type === 'questions') {
				const answers = (interrupt.questions as Array<{ id: string; question: string }>).map(
					(q) => ({
						questionId: q.id,
						question: q.question,
						selectedOptions: ['JSON response'],
						skipped: false,
					}),
				);
				({ interrupt } = await resumeWithValue(graph, answers, threadId));
			}

			expect(interrupt?.type).toBe('plan');
			console.log(`Got plan: "${interrupt!.plan!.summary}"`);

			// Reject
			console.log('Step 2: Rejecting plan...');
			const { result } = await resumeWithValue(graph, { action: 'reject' }, threadId);

			expect(result.planDecision).toBe('reject');
			expect(result.planOutput).toBeNull();

			console.log('✅ Plan rejected\n');
		});
	});

	describe('Build mode skips planner', () => {
		it('should return discovery results without plan interrupt in build mode', async () => {
			if (skipTests) return;

			// Compile without checkpointer — build mode has no interrupts
			const graph = discoverySubgraph.create({
				parsedNodeTypes,
				llm,
				plannerLLM: llm,
				featureFlags: { planMode: true },
			});

			console.log('Invoking in build mode...');
			const result = await graph.invoke({
				userRequest: 'Send daily email with weather forecast',
				workflowJSON: { nodes: [], connections: {}, name: '' },
				mode: 'build' as const,
				planOutput: null,
			});

			// Should have discovered nodes without any plan
			expect(result.nodesFound).toBeDefined();
			expect(result.nodesFound.length).toBeGreaterThan(0);
			expect(result.planOutput).toBeFalsy();
			expect(result.planDecision).toBeFalsy();

			console.log(`✅ Build mode returned ${result.nodesFound.length} nodes, no plan\n`);
		});
	});
});
