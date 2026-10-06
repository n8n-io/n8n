/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern: @vue/test-utils is a transitive devDep */
import { ref, type Ref } from 'vue';
import { mount } from '@vue/test-utils';
import { i18nInstance } from '@n8n/i18n';
import { N8nPagination } from '@n8n/design-system';
import type { AgentChatListItem } from '@n8n/api-types';

import { INSTANCE_AI_VIEW } from '@/features/ai/instanceAi/constants';
import N8nChatAgentLibraryView from '../N8nChatAgentLibraryView.vue';
import N8nChatAgentGrid from '../components/N8nChatAgentGrid.vue';

type Options = { query: Ref<string>; page: Ref<number>; pageSize: Ref<number> };

const useN8nChatAgentsMock = vi.fn();
const retryMock = vi.fn();
vi.mock('../composables/useN8nChatAgents', () => ({
	useN8nChatAgents: (options: Options) => useN8nChatAgentsMock(options),
}));

// A real card needs an installed router (for `RouterLink`) and an active Pinia
// instance (for telemetry) — out of scope for this view-level test, which only
// cares that the grid receives the right agents.
vi.mock('../components/N8nChatAgentCard.vue', () => ({
	default: {
		name: 'N8nChatAgentCard',
		props: ['agent', 'source'],
		template: '<div data-testid="stub-agent-card">{{ agent.name }}</div>',
	},
}));

const pushMock = vi.fn();
const backMock = vi.fn();
const historyBack = { value: undefined as string | undefined };
vi.mock('vue-router', () => ({
	useRouter: () => ({
		push: pushMock,
		back: backMock,
		resolve: vi.fn((to: unknown) => ({ href: JSON.stringify(to), matched: [{}] })),
		options: {
			history: {
				get state() {
					return { back: historyBack.value };
				},
			},
		},
	}),
}));

const agentA: AgentChatListItem = { id: 'a1', name: 'One', project: { id: 'p', name: 'P' } };
const agentB: AgentChatListItem = { id: 'a2', name: 'Two', project: { id: 'p', name: 'P' } };

function setup(result: {
	agents: AgentChatListItem[];
	count: number;
	isLoading: boolean;
	loadFailed?: boolean;
}) {
	useN8nChatAgentsMock.mockReturnValue({
		agents: ref(result.agents),
		count: ref(result.count),
		isLoading: ref(result.isLoading),
		loadFailed: ref(result.loadFailed ?? false),
		retry: retryMock,
	});

	return mount(N8nChatAgentLibraryView, {
		global: {
			plugins: [i18nInstance],
			stubs: {
				N8nInput: {
					props: ['modelValue'],
					emits: ['update:modelValue'],
					template:
						'<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
				},
			},
		},
	});
}

describe('N8nChatAgentLibraryView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		historyBack.value = undefined;
	});

	it('renders the title and the agent grid', () => {
		const wrapper = setup({ agents: [agentA, agentB], count: 2, isLoading: false });

		expect(wrapper.text()).toContain('Agents library');
		const grid = wrapper.findComponent(N8nChatAgentGrid);
		expect(grid.props('agents')).toEqual([agentA, agentB]);
		expect(grid.props('source')).toBe('library');
	});

	it('caps the search input at 128 characters', () => {
		const wrapper = setup({ agents: [], count: 0, isLoading: false });

		expect(wrapper.get('[data-testid="n8n-chat-library-search"]').attributes('maxlength')).toBe(
			'128',
		);
	});

	it('shows the no-agents empty state when there is no search and no agents', () => {
		const wrapper = setup({ agents: [], count: 0, isLoading: false });

		expect(wrapper.find('[data-testid="n8n-chat-library-empty"]').exists()).toBe(true);
		expect(wrapper.text()).toContain('No agents available to chat with yet');
	});

	it('shows a no-results empty state once a search is active and nothing matches', async () => {
		const wrapper = setup({ agents: [], count: 0, isLoading: false });

		await wrapper.get('[data-testid="n8n-chat-library-search"]').setValue('zzz');
		await vi.waitFor(() => {
			expect(useN8nChatAgentsMock.mock.calls[0][0].query.value).toBe('zzz');
		});
		await wrapper.vm.$nextTick();

		expect(wrapper.text()).toContain('No agents match your search');
	});

	it('shows a retryable error state instead of the empty state on a failed fetch', () => {
		const wrapper = setup({ agents: [], count: 0, isLoading: false, loadFailed: true });

		expect(wrapper.find('[data-testid="n8n-chat-library-error"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="n8n-chat-library-empty"]').exists()).toBe(false);
		expect(wrapper.findComponent(N8nChatAgentGrid).exists()).toBe(false);
	});

	it('shows the error state even with stale results, and retries on click', async () => {
		const wrapper = setup({ agents: [agentA], count: 1, isLoading: false, loadFailed: true });

		const errorState = wrapper.get('[data-testid="n8n-chat-library-error"]');
		expect(wrapper.findComponent(N8nChatAgentGrid).exists()).toBe(false);

		await errorState.get('button').trigger('click');
		expect(retryMock).toHaveBeenCalledOnce();
	});

	it('resets to page 1 once the search query actually changes', async () => {
		const wrapper = setup({ agents: [], count: 0, isLoading: false });
		const options = useN8nChatAgentsMock.mock.calls[0][0] as Options;
		options.page.value = 3;

		await wrapper.get('[data-testid="n8n-chat-library-search"]').setValue('support');
		await vi.waitFor(() => {
			expect(options.query.value).toBe('support');
		});

		expect(options.page.value).toBe(1);
	});

	it('keeps the current page when the debounced query is unchanged after trimming', async () => {
		vi.useFakeTimers();
		try {
			const wrapper = setup({ agents: [], count: 0, isLoading: false });
			const options = useN8nChatAgentsMock.mock.calls[0][0] as Options;
			const search = wrapper.get('[data-testid="n8n-chat-library-search"]');

			await search.setValue('support');
			await vi.advanceTimersByTimeAsync(300);
			expect(options.query.value).toBe('support');

			// Change the page within the debounce window, then let a value that
			// trims to the same query debounce through — the page must not reset.
			options.page.value = 3;
			await search.setValue('  support  ');
			await vi.advanceTimersByTimeAsync(300);

			expect(options.query.value).toBe('support');
			expect(options.page.value).toBe(3);
		} finally {
			vi.useRealTimers();
		}
	});

	it('shows pagination with a total and page sizes once there are agents', () => {
		const empty = setup({ agents: [], count: 0, isLoading: false });
		expect(empty.findComponent(N8nPagination).exists()).toBe(false);

		const pagination = setup({ agents: [agentA], count: 1, isLoading: false }).findComponent(
			N8nPagination,
		);
		expect(pagination.exists()).toBe(true);
		expect(pagination.props('pageSizes')).toEqual([10, 25, 50, 100]);
		expect(pagination.props('itemsPerPage')).toBe(50);
	});

	it('goes back to the first page when the page size changes', async () => {
		const wrapper = setup({ agents: [agentA], count: 120, isLoading: false });
		const options = useN8nChatAgentsMock.mock.lastCall?.[0] as Options;
		options.page.value = 3;

		wrapper.findComponent(N8nPagination).vm.$emit('update:itemsPerPage', 25);
		await wrapper.vm.$nextTick();

		expect(options.pageSize.value).toBe(25);
		expect(options.page.value).toBe(1);
	});

	it('goes to the n8n Assistant page, not back in history, even with in-app history', async () => {
		historyBack.value = '/some/previous/route';
		const wrapper = setup({ agents: [], count: 0, isLoading: false });

		await wrapper.get('[data-testid="n8n-chat-back"]').trigger('click');
		expect(pushMock).toHaveBeenCalledWith({ name: INSTANCE_AI_VIEW });
		expect(backMock).not.toHaveBeenCalled();
	});
});
