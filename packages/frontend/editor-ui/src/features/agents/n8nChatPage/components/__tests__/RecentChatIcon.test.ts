/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern: @vue/test-utils is a transitive devDep */
import { mount } from '@vue/test-utils';

import RecentChatIcon from '../RecentChatIcon.vue';
import type { RecentChatItem } from '../../mergeRecentChats';

const assistantItem: RecentChatItem = {
	kind: 'assistant',
	thread: {
		id: 't1',
		title: 'Chat',
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
	},
};
const agentItem: RecentChatItem = {
	kind: 'agent',
	thread: {
		id: 'g1',
		title: null,
		updatedAt: '2026-01-01T00:00:00.000Z',
		agent: { id: 'agent-1', name: 'Support', projectId: 'project-1' },
	},
};

describe('RecentChatIcon', () => {
	it('shows the AI sparkle for an Assistant thread', () => {
		expect(
			mount(RecentChatIcon, { props: { item: assistantItem } })
				.find('[data-icon="sparkles"]')
				.exists(),
		).toBe(true);
	});

	it('shows the agent avatar for an agent thread', () => {
		const wrapper = mount(RecentChatIcon, { props: { item: agentItem } });
		expect(wrapper.find('[data-test-id="agent-personalisation-icon-tile"]').exists()).toBe(true);
	});

	it('renders nothing without an item', () => {
		expect(mount(RecentChatIcon).html()).toBe('<!--v-if-->');
	});
});
