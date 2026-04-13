import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: vi.fn() }),
	useRoute: () => ({ params: { projectId: 'test-project', agentId: 'test-agent' }, query: {} }),
	RouterLink: { template: '<a><slot/></a>' },
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => {
			const map: Record<string, string> = {
				'agents.home.untitledAgent': 'Untitled Agent',
				'agents.home.addDescription': 'Add a description here',
				'agents.home.sendMessage': 'Send a message...',
				'agents.home.recent': 'Recent',
				'agents.home.emptyState': 'No conversations yet',
				'agents.home.iconPicker.tooltip': 'Change agent icon',
			};
			return map[key] ?? key;
		},
	}),
}));

vi.mock('is-emoji-supported', () => ({
	isEmojiSupported: () => true,
}));

describe('AgentHomeContent', () => {
	async function renderComponent(props: Partial<Record<string, unknown>> = {}) {
		const { default: AgentHomeContent } = await import('../components/AgentHomeContent.vue');
		return mount(AgentHomeContent, {
			props: {
				agentName: 'Test Agent',
				agentDescription: 'A test agent description',
				agentIcon: { type: 'icon', value: 'robot' },
				projectId: 'test-project',
				agentId: 'test-agent',
				...props,
			},
			global: {
				stubs: {
					ChatInputBase: { template: '<div data-testid="chat-input-stub" />' },
					N8nIconPicker: { template: '<div data-testid="icon-picker-stub" />' },
					N8nText: {
						template: '<span v-bind="$attrs"><slot/></span>',
						props: ['size', 'color', 'tag', 'bold'],
					},
				},
			},
		});
	}

	it('renders the agent name', async () => {
		const wrapper = await renderComponent({ agentName: 'Test Agent' });
		const heading = wrapper.find('h2');
		expect(heading.text()).toBe('Test Agent');
	}, 15_000);

	it('renders "Untitled Agent" when name is empty', async () => {
		const wrapper = await renderComponent({ agentName: '' });
		expect(wrapper.text()).toContain('Untitled Agent');
	});

	it('renders the agent description', async () => {
		const wrapper = await renderComponent();
		expect(wrapper.text()).toContain('A test agent description');
	});

	it('renders placeholder when description is null', async () => {
		const wrapper = await renderComponent({ agentDescription: null });
		expect(wrapper.text()).toContain('Add a description here');
	});

	it('enters name editing mode on click', async () => {
		const wrapper = await renderComponent();
		const heading = wrapper.find('h2');
		await heading.trigger('click');
		const input = wrapper.find('input');
		expect(input.exists()).toBe(true);
		expect((input.element as HTMLInputElement).value).toBe('Test Agent');
	});

	it('emits update:name on Enter', async () => {
		const wrapper = await renderComponent();
		await wrapper.find('h2').trigger('click');
		const input = wrapper.find('input');
		await input.setValue('New Name');
		await input.trigger('keydown', { key: 'Enter' });
		expect(wrapper.emitted('update:name')?.[0]).toEqual(['New Name']);
	});

	it('cancels name editing on Escape', async () => {
		const wrapper = await renderComponent();
		await wrapper.find('h2').trigger('click');
		const input = wrapper.find('input');
		await input.setValue('New Name');
		await input.trigger('keydown', { key: 'Escape' });
		expect(wrapper.emitted('update:name')).toBeUndefined();
		expect(wrapper.find('h2').exists()).toBe(true);
	});

	it('renders the recent sessions empty state', async () => {
		const wrapper = await renderComponent();
		expect(wrapper.text()).toContain('Recent');
		expect(wrapper.text()).toContain('No conversations yet');
	});

	it('renders the chat input', async () => {
		const wrapper = await renderComponent();
		expect(wrapper.find('[data-testid="chat-input-stub"]').exists()).toBe(true);
	});

	it('renders the icon picker', async () => {
		const wrapper = await renderComponent();
		expect(wrapper.find('[data-testid="icon-picker-stub"]').exists()).toBe(true);
	});
});
