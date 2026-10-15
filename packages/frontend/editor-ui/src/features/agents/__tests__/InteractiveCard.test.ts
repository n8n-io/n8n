import { mount } from '@vue/test-utils';
import { WAIT_TOOL_NAME } from '@n8n/api-types';
import { computed } from 'vue';
import { describe, expect, it } from 'vitest';

import { INTERACTION_EXTENSION_TOOL_NAME } from '@/features/ai/shared/agentsChat/constants';
import { AGENTS_CHAT_INTERACTION_EXTENSIONS } from '@/features/ai/shared/agentsChat/interactionRegistry';
import type { InteractivePayload } from '@/features/ai/shared/agentsChat/types';
import {
	TEST_EXTENSION_KEY,
	testInteractionExtensions,
} from '@/features/ai/shared/agentsChat/__tests__/fixtures/testInteractionExtension';
import InteractiveCard from '../components/interactive/InteractiveCard.vue';

const extensionPayload: InteractivePayload = {
	toolName: INTERACTION_EXTENSION_TOOL_NAME,
	extensionKey: TEST_EXTENSION_KEY,
	toolCallId: 'tc-ext',
	runId: 'run-ext',
	input: { question: 'Continue?', tool: 'ask_host' },
};

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

	it('renders a host extension card and emits its resume data', async () => {
		const wrapper = mount(InteractiveCard, {
			props: { payload: extensionPayload },
			global: {
				provide: {
					[AGENTS_CHAT_INTERACTION_EXTENSIONS]: computed(() => testInteractionExtensions),
				},
			},
		});

		expect(wrapper.find('[data-testid="test-card"]').text()).toContain('Continue?');

		await wrapper.find('[data-testid="test-card-answer"]').trigger('click');

		expect(wrapper.emitted('submit')).toEqual([[{ answer: 'yes' }]]);
	});

	it('disables a host extension card that has no run to resume', () => {
		const wrapper = mount(InteractiveCard, {
			props: { payload: { ...extensionPayload, runId: undefined } },
			global: {
				provide: {
					[AGENTS_CHAT_INTERACTION_EXTENSIONS]: computed(() => testInteractionExtensions),
				},
			},
		});

		expect(wrapper.find('[data-testid="test-card-answer"]').attributes('disabled')).toBeDefined();
	});

	it('renders nothing for an extension without a card component', () => {
		const wrapper = mount(InteractiveCard, {
			props: { payload: extensionPayload },
			global: {
				provide: {
					[AGENTS_CHAT_INTERACTION_EXTENSIONS]: computed(() => [{ key: TEST_EXTENSION_KEY }]),
				},
			},
		});

		expect(wrapper.find('[data-testid="test-card"]').exists()).toBe(false);
		expect(wrapper.text()).toBe('');
	});

	it('renders nothing for an extension card that the chat does not provide', () => {
		const wrapper = mount(InteractiveCard, { props: { payload: extensionPayload } });

		expect(wrapper.find('[data-testid="test-card"]').exists()).toBe(false);
		expect(wrapper.text()).toBe('');
	});
});
