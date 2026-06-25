/* eslint-disable import-x/no-extraneous-dependencies -- test-only Vue mounting */
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AgentModelsByProvider } from '../model-providers';

const credentialsByType = vi.hoisted(() => ({
	anthropicApi: [{ id: 'anthropic-cred', name: 'Anthropic credential', type: 'anthropicApi' }],
}));
const openNewCredential = vi.hoisted(() => vi.fn());

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) =>
			({
				'agents.modelSelector.defaultLabel': 'Choose model',
				'agents.modelSelector.configureCredentials': 'Configure credentials',
				'agents.modelSelector.credentialsMissing': 'Credentials missing',
				'agents.modelSelector.noMatch': 'No match',
				'agents.modelSelector.noModels': 'No models',
				'agents.modelSelector.moreModels': 'More models',
				'generic.loadingEllipsis': 'Loading...',
			})[key] ?? key,
	}),
}));

vi.mock('@n8n/permissions', () => ({
	getResourcePermissions: () => ({ credential: { create: true } }),
}));

vi.mock('@n8n/design-system', () => ({
	N8nIcon: { template: '<span />', props: ['icon', 'size'] },
}));

vi.mock('@/features/credentials/components/CredentialIcon.vue', () => ({
	default: { template: '<span />', props: ['credentialTypeName', 'size'] },
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		getCredentialById: (id: string) =>
			Object.values(credentialsByType)
				.flat()
				.find((credential) => credential.id === id),
		getCredentialsByType: (type: keyof typeof credentialsByType) => credentialsByType[type] ?? [],
		getCredentialTypeByName: (type: string) => ({ displayName: type }),
	}),
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({
		currentProject: { id: 'project-1', scopes: [] },
		personalProject: { id: 'project-1', scopes: [] },
		myProjects: [{ id: 'project-1', scopes: [] }],
	}),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ openNewCredential }),
}));

vi.mock('@/features/ai/modelSelector/AiModelSelectorDropdown.vue', () => ({
	default: {
		name: 'AiModelSelectorDropdown',
		props: [
			'items',
			'selectedLabel',
			'selectedCredentialName',
			'credentialsMissing',
			'credentialsMissingLabel',
			'noMatchLabel',
			'horizontal',
			'disabled',
			'dataTestId',
			'credentialDataTestId',
			'maxSelectedNameChars',
		],
		emits: ['select'],
		template: '<div data-testid="ai-model-selector-dropdown" />',
	},
}));

const modelsByProvider: AgentModelsByProvider = {
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
};

async function mountSelector(credentials: Record<string, string | null>) {
	const { default: AgentModelSelector } = await import('../components/AgentModelSelector.vue');
	return mount(AgentModelSelector, {
		props: {
			selectedModel: modelsByProvider.anthropic?.models[0] ?? null,
			credentials,
			modelsByProvider,
			isLoading: false,
			projectId: 'project-1',
			warnMissingCredentials: true,
		},
	});
}

describe('AgentModelSelector', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('surfaces a stale selected credential as missing', async () => {
		const wrapper = await mountSelector({ anthropic: 'deleted-credential' });
		const dropdown = wrapper.findComponent({ name: 'AiModelSelectorDropdown' });
		const anthropicItem = (
			dropdown.props('items') as Array<{ id: string; children?: unknown[] }>
		).find((item) => item.id === 'anthropic');

		expect(dropdown.props('credentialsMissing')).toBe(true);
		expect(dropdown.props('selectedCredentialName')).toBeUndefined();
		expect(JSON.stringify(anthropicItem?.children ?? [])).not.toContain('Claude Sonnet 4.5');
	});

	it('uses an available selected credential', async () => {
		const wrapper = await mountSelector({ anthropic: 'anthropic-cred' });
		const dropdown = wrapper.findComponent({ name: 'AiModelSelectorDropdown' });
		const anthropicItem = (
			dropdown.props('items') as Array<{ id: string; children?: unknown[] }>
		).find((item) => item.id === 'anthropic');

		expect(dropdown.props('credentialsMissing')).toBe(false);
		expect(dropdown.props('selectedCredentialName')).toBe('Anthropic credential');
		expect(JSON.stringify(anthropicItem?.children ?? [])).toContain('Claude Sonnet 4.5');
	});

	it('hides the assistant when opening credential creation from the configure action', async () => {
		const wrapper = await mountSelector({ anthropic: null });
		const dropdown = wrapper.findComponent({ name: 'AiModelSelectorDropdown' });

		dropdown.vm.$emit('select', 'anthropic::configure::anthropicApi');

		expect(openNewCredential).toHaveBeenCalledWith(
			'anthropicApi',
			false,
			false,
			'project-1',
			undefined,
			undefined,
			undefined,
			{ hideAskAssistant: true },
		);
	});
});
