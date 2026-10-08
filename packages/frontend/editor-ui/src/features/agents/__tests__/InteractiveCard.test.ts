import { flushPromises, mount } from '@vue/test-utils';
import { WAIT_TOOL_NAME } from '@n8n/api-types';
import { describe, expect, it, vi } from 'vitest';

import { ASSISTANT_CONFIRMATION_TOOL_NAME } from '@/features/ai/shared/agentsChat/assistantConfirmation';
import InteractiveCard from '../components/interactive/InteractiveCard.vue';

vi.mock('@/features/ai/instanceAi/sharing/SharedThreadCard.vue', async () => {
	const { defineComponent, h } = await import('vue');
	// The card loads on demand: the loader takes `default` only from an ES module.
	return {
		__esModule: true,
		default: defineComponent({
			props: ['input', 'call', 'disabled'],
			emits: ['submit'],
			setup(props, { emit }) {
				return () =>
					h('button', {
						'data-test-id': 'assistant-card-stub',
						'data-props': JSON.stringify(props),
						onClick: () => emit('submit', { kind: 'approval', approved: true }),
					});
			},
		}),
	};
});

describe('InteractiveCard', () => {
	// A workflow tool parked on a Wait node reuses the chat card renderer, and its
	// buttons resume the parked run with the value the backend declared.
	it('renders the waiting card and emits the clicked button as resume data', async () => {
		const wrapper = mount(InteractiveCard, {
			props: {
				payload: {
					toolName: WAIT_TOOL_NAME,
					toolCallId: 'tc-wait',
					runId: 'run-wait',
					input: {
						card: {
							title: 'Waiting on "Approval workflow"',
							components: [
								{ type: 'section', text: 'The "Approval workflow" workflow is paused.' },
								{ type: 'button', label: 'Check for the result', value: 'continue' },
								{ type: 'button', label: 'Stop waiting', value: 'cancel' },
							],
						},
					},
				},
			},
		});

		expect(wrapper.text()).toContain('Waiting on "Approval workflow"');
		const buttons = wrapper.findAll('[data-testid="n8n-chat-card-button"]');
		expect(buttons.map((button) => button.text())).toEqual([
			'Check for the result',
			'Stop waiting',
		]);

		await buttons[1].trigger('click');

		expect(wrapper.emitted('submit')).toEqual([[{ type: 'button', value: 'cancel' }]]);
	});

	it('renders an Assistant card with the tool call behind it, for the shared-chat rules', async () => {
		const call = {
			toolName: 'executions',
			input: { action: 'run', workflowId: 'wf-1' },
			suspendPayload: { requestId: 'r-1', message: 'Run?', severity: 'info' },
		};
		const wrapper = mount(InteractiveCard, {
			props: {
				payload: {
					toolName: ASSISTANT_CONFIRMATION_TOOL_NAME,
					toolCallId: 'tc-1',
					runId: 'run-1',
					input: { requestId: 'r-1', message: 'Run?' },
					call,
				},
			},
		});
		await flushPromises();

		const card = wrapper.get('[data-test-id="assistant-card-stub"]');
		expect(JSON.parse(card.attributes('data-props') ?? '{}')).toEqual({
			input: { requestId: 'r-1', message: 'Run?' },
			call,
			disabled: false,
		});

		await card.trigger('click');
		expect(wrapper.emitted('submit')).toEqual([[{ kind: 'approval', approved: true }]]);
	});
});
