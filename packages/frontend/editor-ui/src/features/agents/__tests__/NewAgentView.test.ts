/* eslint-disable import-x/no-extraneous-dependencies, @typescript-eslint/no-unsafe-assignment -- test-only patterns: @vue/test-utils is a transitive devDep and any-based mock reads */
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: vi.fn() }),
	useRoute: () => ({ params: { projectId: 'test-project' }, query: {} }),
	RouterLink: { template: '<a><slot/></a>' },
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost:5678' } }),
}));

vi.mock('@/features/settings/users/users.store', () => ({
	useUsersStore: () => ({ currentUser: { firstName: 'Test' } }),
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({ personalProject: { id: 'test-project' } }),
}));

vi.mock('../composables/useAgentApi', () => ({
	createAgent: vi.fn().mockResolvedValue({ id: 'new-agent-id', name: 'New Agent' }),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, opts?: { interpolate?: Record<string, string> }) => {
			if (key === 'agents.newAgent.heading') {
				return `Let's build something${opts?.interpolate?.name ?? ''}`;
			}
			return key;
		},
	}),
}));

describe('NewAgentView', () => {
	async function renderView() {
		const { default: NewAgentView } = await import('../views/NewAgentView.vue');
		return mount(NewAgentView, {
			global: {
				stubs: {
					ChatInputBase: { template: '<div data-testid="chat-input-stub" />' },
					N8nButton: { template: '<button v-bind="$attrs"><slot/></button>' },
					N8nText: { template: '<span v-bind="$attrs"><slot/></span>' },
				},
			},
		});
	}

	it('renders the heading with user name', async () => {
		const wrapper = await renderView();
		expect(wrapper.text()).toContain("Let's build something, Test");
	}, 15_000);

	it('renders 3 suggestion cards', async () => {
		const wrapper = await renderView();
		const cards = wrapper.findAll('[data-testid="agent-suggestion-card"]');
		expect(cards).toHaveLength(3);
	});

	it('renders Create blank button', async () => {
		const wrapper = await renderView();
		const btn = wrapper.find('[data-testid="create-blank-agent"]');
		expect(btn.exists()).toBe(true);
	});

	it('populates input when clicking a suggestion', async () => {
		const wrapper = await renderView();
		const cards = wrapper.findAll('[data-testid="agent-suggestion-card"]');
		await cards[0].trigger('click');
		// The component should have set inputText — verify via the component's internal state
		expect((wrapper.vm as unknown as { inputText: string }).inputText).toContain('SEO');
	});
});
