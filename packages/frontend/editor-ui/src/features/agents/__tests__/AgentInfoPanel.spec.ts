import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import AgentInfoPanel from '../components/AgentInfoPanel.vue';

const ensureLoadedMock = vi.fn();
const selectCredentialMock = vi.fn();

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			({
				'agents.builder.agent.instructions.label': 'Instructions',
				'agents.builder.agent.instructions.placeholder': 'Enter instructions here',
				'agents.builder.agent.instructions.characterCount': `${options?.interpolate?.count ?? '0'} characters`,
			})[key] ?? key,
	}),
}));

vi.mock('@n8n/design-system', () => ({
	N8nMarkdownEditor: {
		name: 'N8nMarkdownEditor',
		props: ['modelValue', 'variant', 'showToolbar', 'placeholder', 'readonly', 'maxHeight'],
		emits: ['update:modelValue'],
		template:
			'<div v-bind="$attrs" data-testid="markdown-editor">{{ modelValue }} {{ placeholder }}</div>',
	},
	N8nText: { template: '<span><slot /></span>', props: ['tag', 'bold', 'size', 'color'] },
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn() }),
}));

vi.mock('@/features/settings/users/users.store', () => ({
	useUsersStore: () => ({ currentUserId: 'user-1' }),
}));

vi.mock('../composables/useAgentProjectId', () => ({
	useAgentProjectId: () => ref('project-1'),
}));

vi.mock('../composables/useAgentModelCredentials', () => ({
	useAgentModelCredentials: () => ({
		credentialsByProvider: ref({ anthropic: 'credential-1' }),
		selectCredential: selectCredentialMock,
	}),
}));

vi.mock('../composables/useModelCatalog', () => ({
	useModelCatalog: () => ({
		ensureLoaded: ensureLoadedMock,
		getModelsForPicker: () => ({
			anthropic: {
				models: [
					{
						provider: 'anthropic',
						model: 'claude-sonnet-4-5',
						name: 'Claude Sonnet 4.5',
						description: null,
						createdAt: null,
						metadata: { functionCalling: true, available: true },
					},
				],
			},
		}),
		isLoading: ref(false),
	}),
}));

vi.mock('../components/AgentModelSelector.vue', () => ({
	default: {
		name: 'AgentModelSelector',
		template: '<div data-testid="agent-model-selector" />',
		props: ['selectedModel'],
	},
}));

function mountPanel(
	instructions = '# Role\nHelp users.',
	overrides: Partial<{ showInstructionsToolbar: boolean }> = {},
) {
	return mount(AgentInfoPanel, {
		props: {
			config: {
				name: 'Support agent',
				model: 'anthropic/claude-sonnet-4-5',
				credential: 'credential-1',
				instructions,
			},
			projectId: 'project-1',
			showModel: false,
			embedded: true,
			...overrides,
		},
	});
}

describe('AgentInfoPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders instructions as a contained markdown editor', () => {
		const wrapper = mountPanel();

		const editor = wrapper.findComponent({ name: 'N8nMarkdownEditor' });
		expect(editor.props()).toMatchObject({
			modelValue: '# Role\nHelp users.',
			variant: 'contained',
			showToolbar: 'never',
			maxHeight: 'none',
		});
		expect(editor.props('placeholder')).toBeUndefined();
		expect(wrapper.find('[data-testid="agent-instructions-document"]').exists()).toBe(true);
		expect(wrapper.text()).not.toContain('characters');
		expect(wrapper.text()).not.toContain('Enter instructions here');
	});

	it('can show the markdown toolbar above instructions', () => {
		const wrapper = mountPanel('# Role\nHelp users.', { showInstructionsToolbar: true });

		const editor = wrapper.findComponent({ name: 'N8nMarkdownEditor' });
		expect(editor.props()).toMatchObject({
			showToolbar: 'always',
			variant: 'contained',
		});
	});

	it('does not pass placeholder text to the instructions editor', () => {
		const wrapper = mountPanel('');

		const editor = wrapper.findComponent({ name: 'N8nMarkdownEditor' });
		expect(editor.props('modelValue')).toBe('');
		expect(editor.props('placeholder')).toBeUndefined();
		expect(wrapper.text()).not.toContain('Enter instructions here');
	});
});
