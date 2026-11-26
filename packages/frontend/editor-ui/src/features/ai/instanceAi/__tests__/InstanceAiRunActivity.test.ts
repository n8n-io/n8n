import { describe, it, expect, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import type { InstanceAiAgentNode, InstanceAiMessage } from '@n8n/api-types';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import InstanceAiRunActivity from '../components/InstanceAiRunActivity.vue';
import type { ThreadRuntime } from '../instanceAi.store';
import { ThinkingWordKey } from '../../shared/composables/useThinkingWords';
import { ref } from 'vue';

let thread: ThreadRuntime;
const renderComponent = createThreadComponentRenderer(InstanceAiRunActivity, {}, () => thread);

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

/** A finished orchestrator turn with a builder still running in the background. */
function messageWithActiveBuilder(builder: Partial<InstanceAiAgentNode>): InstanceAiMessage {
	return {
		id: 'msg-1',
		role: 'assistant',
		content: '',
		reasoning: '',
		isStreaming: false,
		createdAt: '2026-09-08T00:00:00.000Z',
		agentTree: makeAgentNode({
			children: [
				makeAgentNode({
					agentId: 'builder-1',
					kind: 'builder',
					role: 'workflow-builder',
					status: 'active',
					...builder,
				}),
			],
		}),
	};
}

describe('InstanceAiRunActivity', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	function renderWith(builder: Partial<InstanceAiAgentNode>) {
		thread = {
			id: 'thread-1',
			messages: [messageWithActiveBuilder(builder)],
			isStreaming: false,
			isAwaitingConfirmation: false,
		} as unknown as ThreadRuntime;
		return renderComponent();
	}

	it('labels the bar with the active builder title', () => {
		const { getByTestId } = renderWith({ title: 'Building workflow' });

		expect(getByTestId('instance-ai-run-activity')).toHaveTextContent('Building workflow');
	});

	it('falls back to the role label when the title is blank', () => {
		const { getByTestId } = renderWith({ title: '' });

		expect(getByTestId('instance-ai-run-activity')).toHaveTextContent('Building workflow');
	});
});

describe('InstanceAiRunActivity, visibility', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	function renderThread(messages: InstanceAiMessage[], overrides: Partial<ThreadRuntime> = {}) {
		thread = {
			id: 'thread-1',
			messages,
			isStreaming: false,
			isAwaitingConfirmation: false,
			...overrides,
		} as unknown as ThreadRuntime;
		return renderComponent({
			global: { provide: { [ThinkingWordKey]: ref('Joining the dots') } },
		});
	}

	it('stays hidden while the orchestrator runs', () => {
		const message = messageWithActiveBuilder({ title: 'Building workflow' });
		message.isStreaming = true;
		message.agentTree!.status = 'active';

		const { queryByTestId } = renderThread([message], { isStreaming: true });

		expect(queryByTestId('instance-ai-run-activity')).not.toBeInTheDocument();
	});

	it.each([false, true])(
		'stays hidden during a streaming follow-up with an agent tree: %s',
		(withAgentTree) => {
			const previous = messageWithActiveBuilder({ title: 'Building workflow' });
			const followUp: InstanceAiMessage = {
				...messageWithActiveBuilder({ title: 'Researching' }),
				id: 'msg-2',
				isStreaming: true,
				agentTree: withAgentTree ? makeAgentNode() : undefined,
			};

			const { queryByTestId } = renderThread([previous, followUp], { isStreaming: true });

			expect(queryByTestId('instance-ai-run-activity')).not.toBeInTheDocument();
		},
	);

	it('stays hidden at run start, before any agent tree exists', () => {
		const { queryByTestId } = renderThread([], { isStreaming: true });

		expect(queryByTestId('instance-ai-run-activity')).not.toBeInTheDocument();
	});

	it('shows for a child agent that is not a builder and still runs', () => {
		const { getByTestId } = renderThread([
			messageWithActiveBuilder({ kind: undefined, role: 'researcher', title: 'Researching' }),
		]);

		expect(getByTestId('instance-ai-run-activity')).toHaveTextContent('Researching');
	});

	it('stays hidden while a confirmation is pending', () => {
		const { queryByTestId } = renderThread(
			[messageWithActiveBuilder({ title: 'Building workflow' })],
			{ isAwaitingConfirmation: true },
		);

		expect(queryByTestId('instance-ai-run-activity')).not.toBeInTheDocument();
	});
});
