import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import { createTestingPinia } from '@pinia/testing';
import ThinkingBlock from '../components/ThinkingBlock.vue';
import type {
	InstanceAiAgentNode,
	InstanceAiTimelineEntry,
	InstanceAiToolCallState,
} from '@n8n/api-types';

const renderComponent = createThreadComponentRenderer(ThinkingBlock, {
	global: {
		stubs: {
			InstanceAiMarkdown: { template: '<span>{{ content }}</span>', props: ['content'] },
			ToolResultJson: true,
			ToolResultRenderer: true,
		},
	},
});

function makeToolCall(overrides: Partial<InstanceAiToolCallState> = {}): InstanceAiToolCallState {
	return {
		toolCallId: 'tc-1',
		toolName: 'search-nodes',
		args: {},
		isLoading: false,
		...overrides,
	};
}

function makeAgentNode(overrides: Partial<InstanceAiAgentNode> = {}): InstanceAiAgentNode {
	return {
		agentId: 'agent-1',
		role: 'orchestrator',
		status: 'completed',
		textContent: '',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [],
		...overrides,
	};
}

const reasoning = (content: string): InstanceAiTimelineEntry => ({ type: 'reasoning', content });
const text = (content: string): InstanceAiTimelineEntry => ({ type: 'text', content });
const toolEntry = (toolCallId: string): InstanceAiTimelineEntry => ({
	type: 'tool-call',
	toolCallId,
});

describe('ThinkingBlock', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
	});

	it('should show duration from tool-call timestamps when settled', () => {
		const tc = makeToolCall({
			startedAt: '2026-01-01T00:00:00Z',
			completedAt: '2026-01-01T00:00:12Z',
		});
		const { getByTestId } = renderComponent({
			props: {
				agentNode: makeAgentNode({ toolCalls: [tc] }),
				entries: [reasoning('hmm'), toolEntry('tc-1')],
				active: false,
			},
		});

		expect(getByTestId('thinking-block-header')).toHaveTextContent('Thought for 12s');
	});

	it('should format durations over a minute', () => {
		const tc = makeToolCall({
			startedAt: '2026-01-01T00:00:00Z',
			completedAt: '2026-01-01T00:01:05Z',
		});
		const { getByTestId } = renderComponent({
			props: {
				agentNode: makeAgentNode({ toolCalls: [tc] }),
				entries: [toolEntry('tc-1')],
				active: false,
			},
		});

		expect(getByTestId('thinking-block-header')).toHaveTextContent('Thought for 1m 5s');
	});

	it('should fall back to a static title when no timestamps exist', () => {
		const { getByTestId } = renderComponent({
			props: {
				agentNode: makeAgentNode(),
				entries: [reasoning('only reasoning, no tools')],
				active: false,
			},
		});

		expect(getByTestId('thinking-block-header')).toHaveTextContent('Finished thinking');
	});

	it('should be collapsed by default when settled', () => {
		const { getByTestId } = renderComponent({
			props: {
				agentNode: makeAgentNode(),
				entries: [reasoning('hmm')],
				active: false,
			},
		});

		expect(getByTestId('thinking-block-header').getAttribute('aria-expanded')).toBe('false');
	});

	it('should stay collapsed while active and stream the latest segment first sentence', () => {
		const { getByTestId } = renderComponent({
			props: {
				agentNode: makeAgentNode({ status: 'active' }),
				entries: [
					reasoning('Reasoning start. More reasoning.'),
					text('Checking the schema first. Then building.'),
				],
				active: true,
			},
		});

		const header = getByTestId('thinking-block-header');
		expect(header.getAttribute('aria-expanded')).toBe('false');
		expect(header).toHaveTextContent('Checking the schema first.');
	});

	it('should keep the previous status line while a new segment is still blank', () => {
		const { getByTestId } = renderComponent({
			props: {
				agentNode: makeAgentNode({ status: 'active' }),
				entries: [
					text('Checking the schema first. Then building.'),
					reasoning('\n\n'), // reasoning streams often open with whitespace
				],
				active: true,
			},
		});

		expect(getByTestId('thinking-block-header')).toHaveTextContent('Checking the schema first.');
	});

	it('should replace the status line when a new trace segment starts', () => {
		const { getByTestId } = renderComponent({
			props: {
				agentNode: makeAgentNode({ status: 'active' }),
				entries: [
					text('Checking the schema first. Then building.'),
					reasoning('The classifier needs rewiring. Fixing it.'),
				],
				active: true,
			},
		});

		expect(getByTestId('thinking-block-header')).toHaveTextContent(
			'The classifier needs rewiring.',
		);
	});

	it('should show the reasoning first sentence before any narration exists', () => {
		const { getByTestId } = renderComponent({
			props: {
				agentNode: makeAgentNode({ status: 'active' }),
				entries: [reasoning('The user wants a Gmail workflow. Let me check the nodes.')],
				active: true,
			},
		});

		expect(getByTestId('thinking-block-header')).toHaveTextContent(
			'The user wants a Gmail workflow.',
		);
	});

	it('should keep the status line unchanged when expanded mid-stream', async () => {
		const { getByTestId } = renderComponent({
			props: {
				agentNode: makeAgentNode({ status: 'active' }),
				entries: [reasoning('Some reasoning. More.')],
				active: true,
			},
		});

		const header = getByTestId('thinking-block-header');
		await userEvent.click(header);

		expect(header.getAttribute('aria-expanded')).toBe('true');
		expect(header).toHaveTextContent('Some reasoning.');
	});

	it('should title the block "Waiting for your input" while paused on a confirmation', () => {
		const { getByTestId } = renderComponent({
			props: {
				agentNode: makeAgentNode({ status: 'active' }),
				entries: [reasoning('Some reasoning. More.')],
				active: true,
				awaitingInput: true,
			},
		});

		expect(getByTestId('thinking-block-header')).toHaveTextContent('Waiting for your input');
	});

	it('should show the latest tool call on the subline while it is the tail entry', () => {
		const tc = makeToolCall({ toolCallId: 'tc-1', toolName: 'search-nodes', isLoading: true });
		const { getByTestId } = renderComponent({
			props: {
				agentNode: makeAgentNode({ status: 'active', toolCalls: [tc] }),
				entries: [reasoning('Looking for nodes. Now searching.'), toolEntry('tc-1')],
				active: true,
			},
		});

		expect(getByTestId('thinking-block-subline')).toBeInTheDocument();
		expect(getByTestId('thinking-block-subline')).not.toHaveTextContent('Thinking');
	});

	it('should show "Thinking" on the subline when no tool call is the tail', () => {
		// Covers the reasoning-only phases (run start, between tool calls) —
		// the block must always carry a live signal while active.
		const tc = makeToolCall({ toolCallId: 'tc-1' });
		const noTools = renderComponent({
			props: {
				agentNode: makeAgentNode({ status: 'active' }),
				entries: [reasoning('Figuring out the trigger. Hmm.')],
				active: true,
			},
		});
		expect(noTools.getByTestId('thinking-block-subline')).toHaveTextContent('Thinking');
		noTools.unmount();

		const toolThenReasoning = renderComponent({
			props: {
				agentNode: makeAgentNode({ status: 'active', toolCalls: [tc] }),
				entries: [toolEntry('tc-1'), reasoning('Got the results. Next step.')],
				active: true,
			},
		});
		expect(toolThenReasoning.getByTestId('thinking-block-subline')).toHaveTextContent('Thinking');
	});

	it('should show the elapsed in the header while expanded', async () => {
		vi.useFakeTimers();
		try {
			const { getByTestId } = renderComponent({
				props: {
					agentNode: makeAgentNode({ status: 'active' }),
					entries: [reasoning('Figuring out the trigger. Hmm.')],
					active: true,
				},
			});

			await vi.advanceTimersByTimeAsync(5000);
			const header = getByTestId('thinking-block-header');
			await fireEvent.click(header);

			// The subline is hidden while expanded — the timer moves to the header.
			expect(header).toHaveTextContent('5s');
		} finally {
			vi.useRealTimers();
		}
	});

	it('should reset the subline timer after an HITL pause', async () => {
		vi.useFakeTimers();
		try {
			const { getByTestId, rerender } = renderComponent({
				props: {
					agentNode: makeAgentNode({ status: 'active' }),
					entries: [reasoning('Figuring out the trigger. Hmm.')],
					active: true,
				},
			});

			await vi.advanceTimersByTimeAsync(5000);
			expect(getByTestId('thinking-block-subline')).toHaveTextContent('5s');

			// Waiting for the user isn't thinking time — resume restarts at zero.
			await rerender({ awaitingInput: true });
			await rerender({ awaitingInput: false });
			await vi.advanceTimersByTimeAsync(1000);

			expect(getByTestId('thinking-block-subline')).toHaveTextContent('1s');
			expect(getByTestId('thinking-block-subline')).not.toHaveTextContent('6s');
		} finally {
			vi.useRealTimers();
		}
	});

	it('should hide the subline when the block settles or pauses for input', () => {
		const tc = makeToolCall({ toolCallId: 'tc-1' });
		const settled = renderComponent({
			props: {
				agentNode: makeAgentNode({ toolCalls: [tc] }),
				entries: [toolEntry('tc-1')],
				active: false,
			},
		});
		expect(settled.queryByTestId('thinking-block-subline')).not.toBeInTheDocument();
		settled.unmount();

		const paused = renderComponent({
			props: {
				agentNode: makeAgentNode({ status: 'active', toolCalls: [tc] }),
				entries: [toolEntry('tc-1')],
				active: true,
				awaitingInput: true,
			},
		});
		expect(paused.queryByTestId('thinking-block-subline')).not.toBeInTheDocument();
	});

	it('should collapse a user-expanded block and settle the title when streaming ends', async () => {
		const tc = makeToolCall({
			startedAt: '2026-01-01T00:00:00Z',
			completedAt: '2026-01-01T00:00:03Z',
		});
		const { getByTestId, rerender } = renderComponent({
			props: {
				agentNode: makeAgentNode({ status: 'active', toolCalls: [tc] }),
				entries: [reasoning('hmm'), toolEntry('tc-1')],
				active: true,
			},
		});

		await userEvent.click(getByTestId('thinking-block-header'));
		await rerender({ active: false });

		const header = getByTestId('thinking-block-header');
		expect(header.getAttribute('aria-expanded')).toBe('false');
		expect(header).toHaveTextContent('Thought for 3s');
	});

	it('should render narration, reasoning, and tool rows inside the rail when expanded', async () => {
		const tc = makeToolCall({ toolCallId: 'tc-1', toolName: 'credentials' });
		const { getByTestId, getAllByText, getByText } = renderComponent({
			props: {
				agentNode: makeAgentNode({ status: 'active', toolCalls: [tc] }),
				entries: [reasoning('deep thoughts'), text('Checking credentials now.'), toolEntry('tc-1')],
				active: true,
			},
		});

		await userEvent.click(getByTestId('thinking-block-header'));

		// Appears twice: as the header status line and as the narration paragraph
		expect(getAllByText('Checking credentials now.')).toHaveLength(2);
		// Reasoning rows are labeled with their own first sentence
		expect(getByText('deep thoughts')).toBeInTheDocument();
	});
});
