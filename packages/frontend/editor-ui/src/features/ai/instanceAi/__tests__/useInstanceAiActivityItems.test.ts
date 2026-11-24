import { describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import { createTestingPinia } from '@pinia/testing';
import { AiActivityTrace } from '../../shared/components/AiActivityTrace';
import { useInstanceAiActivityItems } from '../composables/useInstanceAiActivityItems';
import { ThinkingWordKey } from '../composables/useThinkingWords';
import { defineComponent, h, ref, type PropType } from 'vue';
import type {
	InstanceAiAgentNode,
	InstanceAiTimelineEntry,
	InstanceAiToolCallState,
} from '@n8n/api-types';

/** Renders one block the same way `AgentTimeline` does. */
const ActivityBlock = defineComponent({
	props: {
		agentNode: { type: Object as PropType<InstanceAiAgentNode>, required: true },
		entries: { type: Array as PropType<InstanceAiTimelineEntry[]>, required: true },
		active: { type: Boolean, required: true },
		awaitingInput: { type: Boolean, default: false },
	},
	setup(props) {
		const { activityItems } = useInstanceAiActivityItems(() => props.agentNode);
		return () =>
			h(AiActivityTrace<InstanceAiToolCallState>, {
				items: activityItems({
					entries: props.entries,
					active: props.active,
					awaitingInput: props.awaitingInput,
				}),
			});
	},
});

const renderComponent = createThreadComponentRenderer(ActivityBlock, {
	global: {
		stubs: {
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

describe('useInstanceAiActivityItems', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
	});

	it('renders thinking as its own row, apart from the tool calls', () => {
		const tc = makeToolCall();
		const { getByTestId, getByText } = renderComponent({
			props: {
				agentNode: makeAgentNode({ toolCalls: [tc] }),
				entries: [reasoning('Look up the nodes.'), toolEntry(tc.toolCallId)],
				active: false,
			},
		});

		expect(getByTestId('instance-ai-thinking-block')).toHaveTextContent('Finished thinking');
		expect(getByTestId('instance-ai-thinking-block')).not.toHaveTextContent('Searching nodes');
		expect(getByText('Searching nodes')).toBeVisible();
	});

	it('groups adjacent tool calls under a count', () => {
		const first = makeToolCall({ toolCallId: 'tc-1' });
		const second = makeToolCall({ toolCallId: 'tc-2' });
		const { getByText } = renderComponent({
			props: {
				agentNode: makeAgentNode({ toolCalls: [first, second] }),
				entries: [toolEntry('tc-1'), toolEntry('tc-2')],
				active: false,
			},
		});

		expect(getByText('2 tool calls')).toBeVisible();
	});

	it('shows no thinking row for a settled block without reasoning', () => {
		const tc = makeToolCall();
		const { queryByTestId } = renderComponent({
			props: {
				agentNode: makeAgentNode({ toolCalls: [tc] }),
				entries: [toolEntry(tc.toolCallId)],
				active: false,
			},
		});

		expect(queryByTestId('instance-ai-thinking-block')).toBeNull();
	});

	it('hides the empty thinking row while a tool runs', () => {
		const tc = makeToolCall({ isLoading: true });
		const { queryByTestId } = renderComponent({
			props: {
				agentNode: makeAgentNode({ status: 'active', toolCalls: [tc] }),
				entries: [toolEntry(tc.toolCallId)],
				active: true,
			},
		});

		expect(queryByTestId('instance-ai-thinking-block')).toBeNull();
	});

	it.each(['completed', 'cancelled', 'error'] as const)(
		'keeps a stale loading tool static when its agent is %s',
		(status) => {
			const tc = makeToolCall({ isLoading: true });
			const { getByText } = renderComponent({
				props: {
					agentNode: makeAgentNode({ status, toolCalls: [tc] }),
					entries: [toolEntry(tc.toolCallId)],
					active: false,
				},
			});

			expect(getByText('Searching nodes').className).not.toContain('shimmer');
		},
	);

	it('animates a loading tool owned by a live agent', () => {
		const tc = makeToolCall({ isLoading: true });
		const { getByText } = renderComponent({
			props: {
				agentNode: makeAgentNode({ status: 'active', toolCalls: [tc] }),
				entries: [toolEntry(tc.toolCallId)],
				active: true,
			},
		});

		expect(getByText('Searching nodes').className).toContain('shimmer');
	});

	it('shows an action that Auto mode approved, with the reason', async () => {
		const tc = makeToolCall({
			toolName: 'publish_workflow',
			autoApproval: {
				message: 'Publish "Lead router"',
				reason: 'The user asked to publish this workflow.',
				decidedBy: 'judge',
			},
		});
		const { findByTestId, findByText } = renderComponent({
			props: {
				agentNode: makeAgentNode({ toolCalls: [tc] }),
				entries: [toolEntry(tc.toolCallId)],
				active: false,
			},
		});

		const step = await findByTestId('instance-ai-auto-approval');
		expect(step.textContent).toContain('Approved automatically: Publish "Lead router"');
		await userEvent.click(await findByText('Approved automatically: Publish "Lead router"'));
		expect(await findByText('The user asked to publish this workflow.')).toBeInTheDocument();
	});

	it('labels a multi-line card message with its first line', async () => {
		const tc = makeToolCall({
			toolName: 'data_tables',
			autoApproval: {
				message: 'Add 1 row\n\nRow 1: set "name" to "Jane Doe"',
				reason: 'The user asked for this row.',
				decidedBy: 'judge',
			},
		});
		const { findByTestId } = renderComponent({
			props: {
				agentNode: makeAgentNode({ toolCalls: [tc] }),
				entries: [toolEntry(tc.toolCallId)],
				active: false,
			},
		});

		const step = await findByTestId('instance-ai-auto-approval');
		expect(step.textContent).toContain('Approved automatically: Add 1 row');
		expect(step.textContent).not.toContain('Row 1');
	});

	it('explains an action that the low-risk rule approved', async () => {
		const tc = makeToolCall({
			toolName: 'workspace',
			autoApproval: { message: 'Create folder "Reports"', reason: 'n/a', decidedBy: 'rule' },
		});
		const { findByText } = renderComponent({
			props: {
				agentNode: makeAgentNode({ toolCalls: [tc] }),
				entries: [toolEntry(tc.toolCallId)],
				active: false,
			},
		});

		await userEvent.click(await findByText('Approved automatically: Create folder "Reports"'));
		expect(await findByText("Low-risk action that's easy to undo")).toBeInTheDocument();
	});

	it('shows no auto-approval line for a call that the user approved', () => {
		const tc = makeToolCall({ confirmationStatus: 'approved' });
		const { queryByTestId } = renderComponent({
			props: {
				agentNode: makeAgentNode({ toolCalls: [tc] }),
				entries: [toolEntry(tc.toolCallId)],
				active: false,
			},
		});

		expect(queryByTestId('instance-ai-auto-approval')).not.toBeInTheDocument();
	});

	it('shows the duration from tool-call timestamps when settled', () => {
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

		expect(getByTestId('instance-ai-thinking-block')).toHaveTextContent('Thought for 12s');
	});

	it('formats durations over a minute', () => {
		const tc = makeToolCall({
			startedAt: '2026-01-01T00:00:00Z',
			completedAt: '2026-01-01T00:01:05Z',
		});
		const { getByTestId } = renderComponent({
			props: {
				agentNode: makeAgentNode({ toolCalls: [tc] }),
				entries: [reasoning('hmm'), toolEntry('tc-1')],
				active: false,
			},
		});

		expect(getByTestId('instance-ai-thinking-block')).toHaveTextContent('Thought for 1m 5s');
	});

	it('does not count the time until an interrupted tool call was swept', () => {
		const tc = makeToolCall({
			startedAt: '2026-01-01T00:00:00Z',
			completedAt: '2026-01-02T22:06:23Z',
			interrupted: true,
		});
		const { getByTestId } = renderComponent({
			props: {
				agentNode: makeAgentNode({ toolCalls: [tc] }),
				entries: [reasoning('hmm'), toolEntry('tc-1')],
				active: false,
			},
		});

		expect(getByTestId('instance-ai-thinking-block')).toHaveTextContent('Finished thinking');
	});

	it('ends the duration at the last completed call when a later call was interrupted', () => {
		const done = makeToolCall({
			toolCallId: 'tc-1',
			startedAt: '2026-01-01T00:00:00Z',
			completedAt: '2026-01-01T00:00:12Z',
		});
		const swept = makeToolCall({
			toolCallId: 'tc-2',
			startedAt: '2026-01-01T00:00:13Z',
			completedAt: '2026-01-02T22:06:23Z',
			interrupted: true,
		});
		const { getByTestId } = renderComponent({
			props: {
				agentNode: makeAgentNode({ toolCalls: [done, swept] }),
				entries: [reasoning('hmm'), toolEntry('tc-1'), toolEntry('tc-2')],
				active: false,
			},
		});

		expect(getByTestId('instance-ai-thinking-block')).toHaveTextContent('Thought for 12s');
	});

	it('shows the latest reasoning sentence while active', () => {
		const { getByTestId } = renderComponent({
			props: {
				agentNode: makeAgentNode({ status: 'active' }),
				entries: [reasoning('Reading the workflow first. Then mapping the fields')],
				active: true,
			},
		});

		expect(getByTestId('instance-ai-thinking-block')).toHaveTextContent('Then mapping the fields');
	});

	it('says that it waits for input while paused on a confirmation', () => {
		const { getByTestId } = renderComponent({
			props: {
				agentNode: makeAgentNode({ status: 'active' }),
				entries: [reasoning('Asking the user.')],
				active: true,
				awaitingInput: true,
			},
		});

		expect(getByTestId('instance-ai-thinking-block')).toHaveTextContent('Waiting for your input');
	});

	it('shows narration and reasoning as markdown when expanded', async () => {
		const { getByTestId, getByText } = renderComponent({
			props: {
				agentNode: makeAgentNode(),
				entries: [reasoning('Deep thoughts. More detail.'), text('Checking credentials now.')],
				active: false,
			},
		});

		await userEvent.click(getByTestId('instance-ai-thinking-block').querySelector('button')!);

		expect(getByText('Deep thoughts. More detail.')).toBeVisible();
		expect(getByText('Checking credentials now.')).toBeVisible();
	});
});

describe('skill update activity', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
	});

	it('shows an unnamed unavailable skill without exposing its internal ID', async () => {
		const entry: InstanceAiTimelineEntry = {
			type: 'skill-update',
			runId: 'run-1',
			skillId: 'hub:internal-id',
			version: null,
			change: 'unavailable',
		};
		const { findByRole, findByText, queryByText } = renderComponent({
			props: { agentNode: makeAgentNode(), entries: [entry], active: false },
		});
		await userEvent.click(await findByRole('button', { name: 'A loaded skill is unavailable' }));
		expect(await findByText('The Assistant stopped using this skill')).toBeVisible();
		expect(queryByText('hub:internal-id')).toBeNull();
	});

	it('says that the Assistant loads an updated skill again', async () => {
		const entry: InstanceAiTimelineEntry = {
			type: 'skill-update',
			runId: 'run-1',
			skillId: 'hub:internal-id',
			name: 'Triage',
			version: 'v2',
			change: 'updated',
		};
		const { findByRole, findByText } = renderComponent({
			props: { agentNode: makeAgentNode(), entries: [entry], active: false },
		});
		await userEvent.click(await findByRole('button', { name: 'Skill updated: Triage' }));
		expect(
			await findByText('This skill changed. The Assistant loads the new version when it needs it.'),
		).toBeVisible();
	});
});

describe('thinking word', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
	});

	it('shows the thinking word of the thread instead of "Thinking"', () => {
		const { getByTestId } = renderComponent({
			props: { agentNode: makeAgentNode({ status: 'active' }), entries: [], active: true },
			global: { provide: { [ThinkingWordKey]: ref('Joining the dots') } },
		});

		expect(getByTestId('instance-ai-thinking-block')).toHaveTextContent('Joining the dots');
	});
});
