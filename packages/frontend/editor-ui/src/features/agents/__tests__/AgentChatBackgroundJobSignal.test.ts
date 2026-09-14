import type { AgentBackgroundJobSignal } from '@n8n/api-types';
import { N8nAiActivityStep, N8nIcon } from '@n8n/design-system';
import userEvent from '@testing-library/user-event';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentChatBackgroundJobSignal from '../components/AgentChatBackgroundJobSignal.vue';

vi.mock('@n8n/i18n', () => ({ useI18n: () => ({ baseText: (key: string) => key }) }));

const signal: AgentBackgroundJobSignal = {
	tasks: [
		{ id: 'job-1', title: 'Research '.repeat(40), kind: 'subagent', status: 'completed' },
		{ id: 'job-2', title: 'Workflow', kind: 'workflow', status: 'failed' },
		{ id: 'job-3', title: 'Review', kind: 'subagent', status: 'cancelled' },
	],
};

describe('AgentChatBackgroundJobSignal', () => {
	it('uses the activity disclosure without loading animation and supports keyboard expansion', async () => {
		const user = userEvent.setup();
		const wrapper = mount(AgentChatBackgroundJobSignal, {
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
				signal.tasks.map((job) => `${job.title}agents.chat.backgroundTasks.status.${job.status}`),
			);
			for (const [index, job] of signal.tasks.entries()) {
				const icon = wrapper.findAll('li')[index].getComponent(N8nIcon);
				expect(icon.props()).toMatchObject({
					icon: job.status === 'completed' ? 'circle-check' : 'circle-x',
					spin: false,
				});
			}
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
