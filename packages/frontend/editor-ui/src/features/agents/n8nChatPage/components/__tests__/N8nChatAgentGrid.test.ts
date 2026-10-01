/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern: @vue/test-utils is a transitive devDep */
import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { i18nInstance } from '@n8n/i18n';
import type { AgentChatListItem } from '@n8n/api-types';

import { AGENT_N8N_CHAT_VIEW } from '../../../constants';
import N8nChatAgentCard from '../N8nChatAgentCard.vue';
import N8nChatAgentGrid from '../N8nChatAgentGrid.vue';

vi.mock('../../../composables/useAgentTelemetry', () => ({
	useAgentTelemetry: () => ({ trackSelectedN8nChatAgent: vi.fn() }),
}));

const stub = { template: '<div />' };
const router = createRouter({
	history: createMemoryHistory(),
	routes: [
		{
			path: '/assistant/agents/:agentId/:agentThreadId?',
			name: AGENT_N8N_CHAT_VIEW,
			component: stub,
		},
	],
});

const agents: AgentChatListItem[] = [
	{ id: 'agent-1', name: 'One', project: { id: 'p', name: 'P' } },
	{ id: 'agent-2', name: 'Two', project: { id: 'p', name: 'P' } },
];

function renderGrid(props: { agents?: AgentChatListItem[]; loading?: boolean } = {}) {
	return mount(N8nChatAgentGrid, {
		props: { agents, source: 'library', ...props },
		global: { plugins: [router, i18nInstance] },
	});
}

describe('N8nChatAgentGrid', () => {
	it('renders one card per agent', () => {
		const wrapper = renderGrid();

		expect(wrapper.findAllComponents(N8nChatAgentCard)).toHaveLength(2);
	});

	it('renders skeleton placeholders instead of cards while loading', () => {
		const wrapper = renderGrid({ loading: true });

		expect(wrapper.findAllComponents(N8nChatAgentCard)).toHaveLength(0);
		expect(wrapper.findAll('[data-test-id="n8n-chat-agent-grid"] > div').length).toBeGreaterThan(0);
	});
});
