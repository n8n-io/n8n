import type { AgentBackgroundTaskSignal } from '@n8n/api-types';
import { N8nAiActivityStep } from '@n8n/design-system';
import userEvent from '@testing-library/user-event';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentChatBackgroundTaskSignal from '../components/AgentChatBackgroundTaskSignal.vue';

vi.mock('@n8n/i18n', () => ({ useI18n: () => ({ baseText: (key: string) => key }) }));

const signal: AgentBackgroundTaskSignal = {
	tasks: [
		{ id: 'job-1', title: 'Research '.repeat(40), kind: 'subagent', status: 'completed' },
		{ id: 'job-2', title: 'Workflow', kind: 'workflow', status: 'failed' },
		{ id: 'job-3', title: 'Review', kind: 'subagent', status: 'cancelled' },
	],
};

describe('AgentChatBackgroundTaskSignal', () => {
	it('uses the activity disclosure without loading animation and supports keyboard expansion', async () => {
		const user = userEvent.setup();
		const wrapper = mount(AgentChatBackgroundTaskSignal, {
			props: { signal },
			attachTo: document.body,
		});
		try {
			const button = wrapper.get('button');
			expect(button.attributes('aria-expanded')).toBe('false');
			expect(wrapper.getComponent(N8nAiActivityStep).props('loading')).toBe(false);
			expect(wrapper.find('[class*="shimmer"], [class*="spin"]').exists()).toBe(false);
			button.element.focus();
			await user.keyboard('{Enter}');
			expect(button.attributes('aria-expanded')).toBe('true');
			expect(wrapper.findAll('li').map((row) => row.text())).toEqual(
				signal.tasks.map(
					(task) => `${task.title}agents.chat.backgroundTasks.status.${task.status}`,
				),
			);
			await wrapper.setProps({ signal: structuredClone(signal) });
			expect(button.attributes('aria-expanded')).toBe('true');
			await user.keyboard(' ');
			expect(button.attributes('aria-expanded')).toBe('false');
			expect(document.activeElement).toBe(button.element);
		} finally {
			wrapper.unmount();
		}
	});
});
