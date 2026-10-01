import { mount } from '@vue/test-utils';
import { WAIT_TOOL_NAME } from '@n8n/api-types';
import { describe, expect, it } from 'vitest';

import InteractiveCard from '../components/interactive/InteractiveCard.vue';

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
});
