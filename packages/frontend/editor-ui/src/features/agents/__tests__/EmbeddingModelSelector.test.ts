/* eslint-disable import-x/no-extraneous-dependencies -- test-only Vue mounting */
import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';

import EmbeddingModelSelector from '../components/EmbeddingModelSelector.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('@n8n/design-system', () => ({
	N8nAiModelSelectorDropdown: {
		name: 'AiModelSelectorDropdown',
		props: [
			'items',
			'selectedLabel',
			'selectedCredentialName',
			'credentialsMissing',
			'credentialsMissingLabel',
			'noMatchLabel',
			'disabled',
			'dataTestId',
			'credentialDataTestId',
		],
		template: '<div data-testid="ai-model-selector-dropdown" />',
	},
}));

vi.mock('@/features/credentials/components/CredentialIcon.vue', () => ({
	default: { name: 'CredentialIcon', props: ['credentialTypeName', 'size'], template: '<span />' },
}));

function mountSelector(selectedModel: string) {
	return mount(EmbeddingModelSelector, {
		props: { selectedModel, selectedCredentialId: null, credentialsByType: {} },
	});
}

describe('EmbeddingModelSelector', () => {
	it('resolves a credential type for a known-provider model', () => {
		const wrapper = mountSelector('openai/text-embedding-3-small');
		const dropdown = wrapper.findComponent({ name: 'AiModelSelectorDropdown' });

		expect(dropdown.props('credentialsMissing')).toBe(true);
	});

	// Regression: a model from a provider outside AGENT_EMBEDDING_PROVIDERS (e.g. one only
	// known to the backend's generic AgentModelSchema) used to crash `credentialTypeFor`
	// with an unchecked `getEmbeddingModelProvider` cast when computing this prop.
	it('treats an unrecognized provider model as having no provider, not missing credentials', () => {
		const wrapper = mountSelector('voyage/voyage-2');
		const dropdown = wrapper.findComponent({ name: 'AiModelSelectorDropdown' });

		expect(dropdown.props('credentialsMissing')).toBe(false);
	});
});
