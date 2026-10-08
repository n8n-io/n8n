/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern: @vue/test-utils is a transitive devDep */
import { mount } from '@vue/test-utils';
import { flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { i18nInstance } from '@n8n/i18n';
import type { AgentChatListItem } from '@n8n/api-types';

import { AGENT_N8N_CHAT_LIBRARY_VIEW, AGENT_N8N_CHAT_VIEW } from '../../../constants';
import SkeletonAgentCard from '@/features/ai/chatHub/components/SkeletonAgentCard.vue';
import N8nChatAgentCard from '../N8nChatAgentCard.vue';
import N8nChatAgentSection from '../N8nChatAgentSection.vue';

const listN8nChatAgentsMock = vi.fn();
vi.mock('../../../composables/useAgentApi', () => ({
	listN8nChatAgents: (...args: unknown[]) => listN8nChatAgentsMock(...args),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest', pushRef: 'push-ref' } }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn() }),
}));

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
		{ path: '/assistant/agents', name: AGENT_N8N_CHAT_LIBRARY_VIEW, component: stub },
	],
});

function agent(id: string, name: string): AgentChatListItem {
	return {
		id,
		name,
		project: { id: 'p', name: 'P' },
		attachments: { image: false, pdf: false, audio: false },
	};
}

function renderSection() {
	return mount(N8nChatAgentSection, { global: { plugins: [router, i18nInstance] } });
}

describe('N8nChatAgentSection', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('requests the first 6 agents, ranked by usage', async () => {
		listN8nChatAgentsMock.mockResolvedValue({ count: 0, data: [] });

		renderSection();
		await flushPromises();

		expect(listN8nChatAgentsMock).toHaveBeenCalledWith(expect.anything(), {
			query: '',
			skip: 0,
			take: 6,
			sortBy: 'usage:desc',
		});
	});

	it('titles the section "Talk to your agents"', () => {
		listN8nChatAgentsMock.mockReturnValue(new Promise(() => {}));

		expect(renderSection().text()).toContain('Talk to your agents');
	});

	it('shows skeletons while loading', () => {
		listN8nChatAgentsMock.mockReturnValue(new Promise(() => {}));

		const wrapper = renderSection();

		expect(wrapper.find('[data-test-id="n8n-chat-agent-section"]').exists()).toBe(true);
		expect(wrapper.findAllComponents(N8nChatAgentCard)).toHaveLength(0);
		expect(wrapper.findAllComponents(SkeletonAgentCard)).not.toHaveLength(0);
	});

	it('renders a card per returned agent', async () => {
		listN8nChatAgentsMock.mockResolvedValue({
			count: 2,
			data: [agent('a1', 'One'), agent('a2', 'Two')],
		});

		const wrapper = renderSection();
		await flushPromises();

		expect(wrapper.findAllComponents(N8nChatAgentCard)).toHaveLength(2);
	});

	it('hides "View all agents" when the library holds 6 agents or fewer', async () => {
		listN8nChatAgentsMock.mockResolvedValue({ count: 6, data: [agent('a1', 'One')] });

		const wrapper = renderSection();
		await flushPromises();

		expect(wrapper.find('[data-test-id="n8n-chat-agent-section-view-all"]').exists()).toBe(false);
	});

	it('shows "View all agents" pointing at the library once there are more than 6', async () => {
		listN8nChatAgentsMock.mockResolvedValue({ count: 7, data: [agent('a1', 'One')] });

		const wrapper = renderSection();
		await flushPromises();
		await router.isReady();

		const viewAll = wrapper.get('[data-test-id="n8n-chat-agent-section-view-all"]');
		expect(viewAll.attributes('href')).toBe('/assistant/agents');
	});

	it('renders nothing once loading ends with no agents', async () => {
		listN8nChatAgentsMock.mockResolvedValue({ count: 0, data: [] });

		const wrapper = renderSection();
		await flushPromises();

		expect(wrapper.find('[data-test-id="n8n-chat-agent-section"]').exists()).toBe(false);
	});

	it('renders nothing when the request fails', async () => {
		listN8nChatAgentsMock.mockRejectedValue(new Error('network down'));

		const wrapper = renderSection();
		await flushPromises();

		expect(wrapper.find('[data-test-id="n8n-chat-agent-section"]').exists()).toBe(false);
	});
});
