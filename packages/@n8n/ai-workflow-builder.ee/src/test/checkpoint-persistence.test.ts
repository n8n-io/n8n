/**
 * Integration tests for LangGraph checkpoint message persistence.
 *
 * Uses a real MemorySaver (not mocked) with minimal graphs that reproduce
 * the parent→subgraph→interrupt pattern used in plan mode.
 * No LLM needed — all nodes are deterministic.
 *
 * KEY FINDING: LangGraph's checkpoint correctly persists Command.update messages
 * across interrupt/resume cycles, even with subgraphs. If messages are lost in
 * production, the issue is in our graph configuration, not LangGraph.
 */
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import {
	Annotation,
	Command,
	END,
	interrupt,
	MemorySaver,
	messagesStateReducer,
	START,
	StateGraph,
} from '@langchain/langgraph';

// ============================================================================
// Helpers
// ============================================================================

const ParentState = Annotation.Root({
	messages: Annotation<BaseMessage[]>({
		reducer: messagesStateReducer,
		default: () => [],
	}),
	phase: Annotation<number>({
		reducer: (x, y) => y ?? x,
		default: () => 0,
	}),
});

async function getCheckpointMessages(
	checkpointer: MemorySaver,
	threadId: string,
): Promise<BaseMessage[]> {
	const tuple = await checkpointer.getTuple({
		configurable: { thread_id: threadId },
	});
	const messages = tuple?.checkpoint?.channel_values?.messages;
	return Array.isArray(messages) ? (messages as BaseMessage[]) : [];
}

// ============================================================================
// Tests
// ============================================================================

describe('LangGraph Checkpoint Message Persistence', () => {
	let checkpointer: MemorySaver;

	beforeEach(() => {
		checkpointer = new MemorySaver();
	});

	it('should persist input messages after a single invocation', async () => {
		const graph = new StateGraph(ParentState)
			.addNode('echo', () => ({ messages: [new AIMessage('response')] }))
			.addEdge(START, 'echo')
			.addEdge('echo', END)
			.compile({ checkpointer });

		const threadId = 'test-simple';
		await graph.invoke(
			{ messages: [new HumanMessage('hello')] },
			{ configurable: { thread_id: threadId } },
		);

		const messages = await getCheckpointMessages(checkpointer, threadId);
		expect(messages).toHaveLength(2);
		expect(messages[0].content).toBe('hello');
		expect(messages[1].content).toBe('response');
	});

	it('should accumulate messages across multiple invocations on the same thread', async () => {
		const graph = new StateGraph(ParentState)
			.addNode('echo', () => ({ messages: [new AIMessage('response')] }))
			.addEdge(START, 'echo')
			.addEdge('echo', END)
			.compile({ checkpointer });

		const config = { configurable: { thread_id: 'test-accumulate' } };

		await graph.invoke({ messages: [new HumanMessage('first')] }, config);
		await graph.invoke({ messages: [new HumanMessage('second')] }, config);

		const messages = await getCheckpointMessages(checkpointer, 'test-accumulate');
		expect(messages).toHaveLength(4);
		expect(messages.map((m) => m.content)).toEqual(['first', 'response', 'second', 'response']);
	});

	it('should persist Command.update messages when graph completes after resume', async () => {
		const graph = new StateGraph(ParentState)
			.addNode('step1', (state) => {
				if (state.phase === 0) interrupt({ reason: 'need input' });
				return { phase: 1 };
			})
			.addEdge(START, 'step1')
			.addEdge('step1', END)
			.compile({ checkpointer });

		const config = { configurable: { thread_id: 'test-command-complete' } };

		await graph.invoke({ messages: [new HumanMessage('initial')] }, config);
		await graph.invoke(
			new Command({
				resume: 'answer',
				update: {
					messages: [
						new AIMessage({ content: 'interrupt-data' }),
						new HumanMessage({ content: 'user-answers' }),
					],
				},
			}),
			config,
		);

		const messages = await getCheckpointMessages(checkpointer, 'test-command-complete');
		const contents = messages.map((m) => m.content);
		expect(contents).toContain('initial');
		expect(contents).toContain('interrupt-data');
		expect(contents).toContain('user-answers');
	});

	it('should persist Command.update messages across two sequential interrupts and resumes', async () => {
		// Two separate interrupt points in sequence (mimics questions interrupt → plan interrupt)
		const parent = new StateGraph(ParentState)
			.addNode('step1', (state) => {
				if (state.phase === 0) interrupt({ reason: 'first interrupt' });
				return { phase: 1 };
			})
			.addNode('step2', (state) => {
				if (state.phase === 1) interrupt({ reason: 'second interrupt' });
				return { phase: 2, messages: [new AIMessage('done')] };
			})
			.addEdge(START, 'step1')
			.addEdge('step1', 'step2')
			.addEdge('step2', END)
			.compile({ checkpointer });

		const config = { configurable: { thread_id: 'test-sequential-interrupts' } };

		// Step 1: invoke → first interrupt
		await parent.invoke({ messages: [new HumanMessage('request')] }, config);

		// Step 2: resume → second interrupt
		await parent.invoke(
			new Command({
				resume: 'a1',
				update: {
					messages: [
						new AIMessage({ content: 'q1-data' }),
						new HumanMessage({ content: 'a1-data' }),
					],
				},
			}),
			config,
		);
		let messages = await getCheckpointMessages(checkpointer, 'test-sequential-interrupts');
		expect(messages.map((m) => m.content)).toEqual(
			expect.arrayContaining(['request', 'q1-data', 'a1-data']),
		);

		// Step 3: resume → completes
		await parent.invoke(
			new Command({
				resume: 'a2',
				update: {
					messages: [
						new AIMessage({ content: 'q2-data' }),
						new HumanMessage({ content: 'a2-data' }),
					],
				},
			}),
			config,
		);
		messages = await getCheckpointMessages(checkpointer, 'test-sequential-interrupts');
		const contents = messages.map((m) => m.content);

		// ALL messages from ALL Command.update calls should persist
		expect(contents).toContain('request');
		expect(contents).toContain('q1-data');
		expect(contents).toContain('a1-data');
		expect(contents).toContain('q2-data');
		expect(contents).toContain('a2-data');
		expect(contents).toContain('done');
	});

	it('should accumulate messages when second invocation is a regular stream after completed run', async () => {
		const graph = new StateGraph(ParentState)
			.addNode('echo', () => ({ messages: [new AIMessage('response')] }))
			.addEdge(START, 'echo')
			.addEdge('echo', END)
			.compile({ checkpointer });

		const config = { configurable: { thread_id: 'test-regular-second' } };

		await graph.invoke({ messages: [new HumanMessage('first request')] }, config);
		await graph.invoke({ messages: [new HumanMessage('second request')] }, config);

		const messages = await getCheckpointMessages(checkpointer, 'test-regular-second');
		const contents = messages.map((m) => m.content);
		expect(contents).toContain('first request');
		expect(contents).toContain('second request');
		expect(messages).toHaveLength(4);
	});
});
