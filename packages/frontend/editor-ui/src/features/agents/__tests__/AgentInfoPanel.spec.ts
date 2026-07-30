import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import AgentInfoPanel from '../components/AgentInfoPanel.vue';

const ensureLoadedMock = vi.fn();
const selectCredentialMock = vi.fn();

// Mutable holder so tests can vary the composable's (localStorage-backed) selection state.
const { credsHolder } = vi.hoisted(() => ({
	credsHolder: { value: { anthropic: 'credential-1' } as Record<string, string | null> },
}));

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
		credentialsByProvider: credsHolder,
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
		props: [
			'selectedModel',
			'credentials',
			'isManagedCredential',
			'warnMissingCredentials',
			'modelsByProvider',
		],
	},
}));

function mountPanel(
	instructions = '# Role\nHelp users.',
	overrides: Partial<{
		showInstructionsToolbar: boolean;
		showModel: boolean;
		config: Record<string, unknown>;
	}> = {},
) {
	const { config: configOverride, ...propOverrides } = overrides;
	return mount(AgentInfoPanel, {
		props: {
			config: {
				name: 'Support agent',
				model: 'anthropic/claude-sonnet-4-5',
				credential: 'credential-1',
				instructions,
				...configOverride,
			},
			projectId: 'project-1',
			showModel: false,
			embedded: true,
			...propOverrides,
		},
	});
}

function selectorProps(wrapper: ReturnType<typeof mountPanel>) {
	return wrapper.findComponent({ name: 'AgentModelSelector' }).props();
}

describe('AgentInfoPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		credsHolder.value = { anthropic: 'credential-1' };
	});

	it('renders instructions as a contained markdown editor', () => {
		const wrapper = mountPanel();

		const editor = wrapper.findComponent({ name: 'N8nMarkdownEditor' });
		expect(editor.props()).toMatchObject({
			modelValue: '# Role\nHelp users.',
			variant: 'contained',
			showToolbar: 'never',
			maxHeight: '360px',
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

	describe('model credential resolution', () => {
		it("overlays the agent config's credential for the model provider (builder-created agent)", () => {
			// Builder writes config.credential but not localStorage, so the manual-selection
			// state falls back to the managed default — the overlay must still surface the real
			// credential so the selector does not read as "credentials missing".
			credsHolder.value = { anthropic: AI_GATEWAY_MANAGED_TAG };

			const wrapper = mountPanel('# Role', {
				showModel: true,
				config: { credential: 'real-cred-x' },
			});

			const props = selectorProps(wrapper);
			expect((props.credentials as Record<string, string>).anthropic).toBe('real-cred-x');
			expect(props.isManagedCredential).toBe(false);
		});

		it('marks the selection as managed when config uses the n8n Connect tag', () => {
			credsHolder.value = { anthropic: 'some-stored-cred' };

			const wrapper = mountPanel('# Role', {
				showModel: true,
				config: { credential: AI_GATEWAY_MANAGED_TAG },
			});

			const props = selectorProps(wrapper);
			expect((props.credentials as Record<string, string>).anthropic).toBe(AI_GATEWAY_MANAGED_TAG);
			expect(props.isManagedCredential).toBe(true);
		});

		it('leaves the manual-selection state untouched when config has no credential', () => {
			credsHolder.value = { anthropic: 'credential-1' };

			const wrapper = mountPanel('# Role', {
				showModel: true,
				config: { credential: undefined },
			});

			const props = selectorProps(wrapper);
			expect((props.credentials as Record<string, string>).anthropic).toBe('credential-1');
		});
	});
});
