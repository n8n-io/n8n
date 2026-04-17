import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { CHATHUB_TO_CATALOG, CATALOG_TO_CHATHUB } from '../provider-mapping';

/**
 * Tests the shared provider mapping used by AgentSettingsSidebar
 * to translate between ChatHub provider IDs and Agent SDK catalog IDs.
 */
describe('Provider ID mapping', () => {
	it('maps all ChatHub providers to catalog IDs', () => {
		expect(CHATHUB_TO_CATALOG.openai).toBe('openai');
		expect(CHATHUB_TO_CATALOG.anthropic).toBe('anthropic');
		expect(CHATHUB_TO_CATALOG.xAiGrok).toBe('xai');
		expect(CHATHUB_TO_CATALOG.deepSeek).toBe('deepseek');
		expect(CHATHUB_TO_CATALOG.mistralCloud).toBe('mistral');
		expect(CHATHUB_TO_CATALOG.openRouter).toBe('openrouter');
		expect(CHATHUB_TO_CATALOG.awsBedrock).toBe('aws-bedrock');
	});

	it('reverse maps catalog IDs back to ChatHub IDs', () => {
		expect(CATALOG_TO_CHATHUB.openai).toBe('openai');
		expect(CATALOG_TO_CHATHUB.anthropic).toBe('anthropic');
		expect(CATALOG_TO_CHATHUB.xai).toBe('xAiGrok');
		expect(CATALOG_TO_CHATHUB.deepseek).toBe('deepSeek');
		expect(CATALOG_TO_CHATHUB.mistral).toBe('mistralCloud');
		expect(CATALOG_TO_CHATHUB.openrouter).toBe('openRouter');
		expect(CATALOG_TO_CHATHUB['aws-bedrock']).toBe('awsBedrock');
	});

	it('prefers azureOpenAi over azureEntraId for azure-openai reverse mapping', () => {
		expect(CATALOG_TO_CHATHUB['azure-openai']).toBe('azureOpenAi');
	});

	it('has a reverse mapping for every unique catalog ID', () => {
		const uniqueCatalogIds = new Set(Object.values(CHATHUB_TO_CATALOG));
		for (const catalogId of uniqueCatalogIds) {
			expect(CATALOG_TO_CHATHUB[catalogId]).toBeDefined();
		}
	});
});

// --- Component tests ---

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: vi.fn() }),
	useRoute: () => ({ params: { projectId: 'test-project', agentId: 'test-agent' } }),
	RouterLink: { template: '<a><slot/></a>' },
}));

const baseTextFn = (key: string) => {
	const map: Record<string, string> = {
		'agents.settings.title': 'Settings',
		'agents.settings.cancel': 'Cancel',
		'agents.settings.save': 'Save',
		'agents.settings.unsavedChanges': 'Unsaved changes',
		'agents.settings.model': 'Model',
		'agents.settings.instructions': 'Instructions',
		'agents.settings.instructions.placeholder': 'Enter instructions...',
		'agents.settings.triggers': 'Triggers',
		'agents.settings.triggers.placeholder': 'No triggers configured',
		'agents.settings.tools': 'Tools',
		'agents.settings.advanced': 'Advanced',
		'agents.settings.code': 'Code',
	};
	return map[key] ?? key;
};

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: baseTextFn }),
	i18n: { baseText: baseTextFn },
}));

vi.mock('@/features/settings/users/users.store', () => ({
	useUsersStore: () => ({ currentUserId: 'user-1' }),
}));

vi.mock('@/features/ai/chatHub/chat.store', () => ({
	useChatStore: () => ({
		agents: {},
		fetchAgents: vi.fn(),
	}),
}));

vi.mock('@/features/ai/chatHub/composables/useChatCredentials', () => ({
	useChatCredentials: () => ({
		credentialsByProvider: { value: null },
		selectCredential: vi.fn(),
	}),
}));

vi.mock('@/features/ai/chatHub/chat.utils', () => ({
	isLlmProviderModel: () => true,
}));

const mockConfig = {
	name: 'Test Agent',
	model: 'anthropic/claude-sonnet-4-6',
	credential: 'cred-1',
	instructions: 'Be helpful',
};

describe('AgentSettingsSidebar', () => {
	async function renderComponent(props: Record<string, unknown> = {}) {
		const { default: AgentSettingsSidebar } = await import(
			'../components/AgentSettingsSidebar.vue'
		);
		return mount(AgentSettingsSidebar, {
			props: {
				config: mockConfig,
				agentTools: {},
				projectId: 'test-project',
				agentId: 'test-agent',
				agentName: 'Test Agent',
				updatedAt: '2026-04-09T00:00:00Z',
				agent: null,
				saveStatus: 'idle',
				...props,
			},
			global: {
				stubs: {
					ModelSelector: { template: '<div data-testid="model-selector-stub" />' },
					AgentToolsPanel: { template: '<div data-testid="tools-panel-stub" />' },
					AgentMemoryPanel: { template: '<div data-testid="memory-panel-stub" />' },
					AgentIntegrationsPanel: { template: '<div data-testid="integrations-panel-stub" />' },
					AgentCodeEditor: { template: '<div data-testid="code-editor-stub" />' },
					N8nButton: {
						template:
							'<button :disabled="disabled" @click="$emit(\'click\')"><slot/>{{ label }}</button>',
						props: ['type', 'size', 'label', 'disabled'],
						emits: ['click'],
					},
					N8nCallout: { template: '<div data-testid="callout-stub"><slot/></div>' },
					N8nIcon: { template: '<span />', props: ['icon', 'size'] },
					N8nInput: {
						template: '<textarea data-testid="instructions-input" />',
						props: ['modelValue', 'type', 'rows', 'placeholder'],
					},
					N8nText: {
						template: '<span v-bind="$attrs"><slot/></span>',
						props: ['tag', 'bold', 'size', 'color'],
					},
				},
			},
		});
	}

	it('renders the settings header', async () => {
		const wrapper = await renderComponent();
		expect(wrapper.text()).toContain('Settings');
	}, 15_000);

	it('renders all sections (Model, Instructions, Triggers, Tools, Advanced, Code)', async () => {
		const wrapper = await renderComponent();
		expect(wrapper.text()).toContain('Model');
		expect(wrapper.text()).toContain('Instructions');
		expect(wrapper.text()).toContain('Triggers');
		expect(wrapper.text()).toContain('Tools');
		expect(wrapper.text()).toContain('Advanced');
		expect(wrapper.text()).toContain('Code');
	});

	it('shows Save and Cancel buttons', async () => {
		const wrapper = await renderComponent();
		expect(wrapper.text()).toContain('Save');
		expect(wrapper.text()).toContain('Cancel');
	});

	it('disables Save/Cancel when not dirty', async () => {
		const wrapper = await renderComponent({ isDirty: false });
		const buttons = wrapper.findAll('button');
		const cancelBtn = buttons.find((b) => b.text().includes('Cancel'));
		expect(cancelBtn?.attributes('disabled')).toBeDefined();
	});

	it('shows unsaved changes banner when dirty', async () => {
		const wrapper = await renderComponent({ isDirty: true });
		expect(wrapper.text()).toContain('Unsaved changes');
	});

	it('hides unsaved changes banner when not dirty', async () => {
		const wrapper = await renderComponent({ isDirty: false });
		expect(wrapper.text()).not.toContain('Unsaved changes');
	});

	it('emits save when Save button is clicked', async () => {
		const wrapper = await renderComponent({ isDirty: true });
		const buttons = wrapper.findAll('button');
		const saveBtn = buttons.find((b) => b.text().includes('Save'));
		await saveBtn?.trigger('click');
		expect(wrapper.emitted('save')).toBeTruthy();
	});

	it('emits cancel when Cancel button is clicked', async () => {
		const wrapper = await renderComponent({ isDirty: true });
		const buttons = wrapper.findAll('button');
		const cancelBtn = buttons.find((b) => b.text().includes('Cancel'));
		await cancelBtn?.trigger('click');
		expect(wrapper.emitted('cancel')).toBeTruthy();
	});

	it('renders the model selector', async () => {
		const wrapper = await renderComponent();
		expect(wrapper.find('[data-testid="model-selector-stub"]').exists()).toBe(true);
	});

	it('expands Tools section when clicked', async () => {
		const wrapper = await renderComponent();
		expect(wrapper.find('[data-testid="tools-panel-stub"]').exists()).toBe(false);

		const toolsHeader = wrapper.findAll('button').find((b) => b.text().includes('Tools'));
		await toolsHeader?.trigger('click');
		expect(wrapper.find('[data-testid="tools-panel-stub"]').exists()).toBe(true);
	});

	it('expands Code section when clicked', async () => {
		const wrapper = await renderComponent();
		expect(wrapper.find('[data-testid="code-editor-stub"]').exists()).toBe(false);

		const codeHeader = wrapper.findAll('button').find((b) => b.text().includes('Code'));
		await codeHeader?.trigger('click');
		expect(wrapper.find('[data-testid="code-editor-stub"]').exists()).toBe(true);
	});

	it('auto-expands Code section when building prop becomes true', async () => {
		const wrapper = await renderComponent({ building: false });
		expect(wrapper.find('[data-testid="code-editor-stub"]').exists()).toBe(false);

		await wrapper.setProps({ building: true });
		expect(wrapper.find('[data-testid="code-editor-stub"]').exists()).toBe(true);
	});

	it('auto-expands Code section when mounted with building already true', async () => {
		const wrapper = await renderComponent({ building: true });
		expect(wrapper.find('[data-testid="code-editor-stub"]').exists()).toBe(true);
	});

	it('expands Triggers section to show integrations panel', async () => {
		const wrapper = await renderComponent();
		expect(wrapper.find('[data-testid="integrations-panel-stub"]').exists()).toBe(false);

		const triggersHeader = wrapper.findAll('button').find((b) => b.text().includes('Triggers'));
		await triggersHeader?.trigger('click');
		expect(wrapper.find('[data-testid="integrations-panel-stub"]').exists()).toBe(true);
	});

	it('expands Advanced section to show memory panel', async () => {
		const wrapper = await renderComponent();
		expect(wrapper.find('[data-testid="memory-panel-stub"]').exists()).toBe(false);

		const advancedHeader = wrapper.findAll('button').find((b) => b.text().includes('Advanced'));
		await advancedHeader?.trigger('click');
		expect(wrapper.find('[data-testid="memory-panel-stub"]').exists()).toBe(true);
	});
});
