/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern: @vue/test-utils is a transitive devDep */
import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { i18nInstance } from '@n8n/i18n';
import type { AgentChatListItem } from '@n8n/api-types';

import { INSTANCE_AI_VIEW } from '@/features/ai/instanceAi/constants';
import { AGENT_N8N_CHAT_VIEW } from '../../../constants';
import SkeletonAgentCard from '@/features/ai/chatHub/components/SkeletonAgentCard.vue';
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
		{ path: '/assistant', name: INSTANCE_AI_VIEW, component: stub },
	],
});

const NO_ATTACHMENTS = { image: false, pdf: false, audio: false };
const agents: AgentChatListItem[] = [
	{ id: 'agent-1', name: 'One', project: { id: 'p', name: 'P' }, attachments: NO_ATTACHMENTS },
	{ id: 'agent-2', name: 'Two', project: { id: 'p', name: 'P' }, attachments: NO_ATTACHMENTS },
];

function renderGrid(
	props: { agents?: AgentChatListItem[]; loading?: boolean; includeAssistant?: boolean } = {},
) {
	return mount(N8nChatAgentGrid, {
		props: { agents, source: 'library', ...props },
		global: { plugins: [router, i18nInstance] },
	});
}

describe('N8nChatAgentGrid', () => {
	it('puts an n8n Assistant card first with includeAssistant', () => {
		const cards = renderGrid({ includeAssistant: true }).findAllComponents(N8nChatAgentCard);

		expect(cards).toHaveLength(3);
		expect(cards[0].props('agent')).toBeNull();
	});

	it('renders one card per agent', () => {
		const wrapper = renderGrid();

		expect(wrapper.findAllComponents(N8nChatAgentCard)).toHaveLength(2);
	});

	it('renders skeleton placeholders instead of cards while loading', () => {
		const wrapper = renderGrid({ loading: true });

		expect(wrapper.findAllComponents(N8nChatAgentCard)).toHaveLength(0);
		expect(wrapper.findAllComponents(SkeletonAgentCard).length).toBeGreaterThan(0);
	});
});
