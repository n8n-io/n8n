import { MANAGED_CREDENTIAL_TOKEN } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';

import { defaultSettings } from '@/__tests__/defaults';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import AgentMemoryPanel from '../components/AgentMemoryPanel.vue';
import type { AgentJsonConfig } from '../types';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('@n8n/design-system', () => ({
	N8nIconButton: {
		template: '<button :data-testid="$attrs[\'data-testid\']" @click="$emit(\'click\', $event)" />',
		props: ['disabled'],
		emits: ['click'],
	},
	N8nSwitch: {
		template:
			'<button :data-testid="$attrs[\'data-testid\']" @click="$emit(\'update:modelValue\', true)" />',
		props: ['modelValue', 'disabled'],
		emits: ['update:modelValue'],
	},
	N8nText: { template: '<span><slot /></span>', props: ['bold', 'size', 'color'] },
	N8nTooltip: { template: '<div><slot /><slot name="content" /></div>' },
}));

vi.mock('../components/AgentModelSelector.vue', () => ({
	default: {
		name: 'AgentModelSelector',
		template: '<div />',
		props: [
			'selectedModel',
			'credentials',
			'modelsByProvider',
			'isLoading',
			'projectId',
			'warnMissingCredentials',
		],
	},
}));

vi.mock('../composables/useAgentProjectId', () => ({
	useAgentProjectId: () => computed(() => 'project-1'),
}));

vi.mock('../composables/useAgentModelCredentials', () => ({
	useAgentModelCredentials: () => ({
		credentialsByProvider: ref({}),
		selectCredential: vi.fn(),
	}),
}));

vi.mock('../composables/useModelCatalog', () => ({
	useModelCatalog: () => ({
		ensureLoaded: vi.fn(),
		getModelsForPicker: vi.fn(() => ({})),
		isLoading: ref(false),
	}),
}));

function baseConfig(): AgentJsonConfig {
	return {
		name: 'Agent',
		model: 'anthropic/claude-sonnet-4-5',
		instructions: 'Help the user.',
		memory: { enabled: true, storage: 'n8n' },
	};
}

function mountPanel({ aiAssistantEnabled }: { aiAssistantEnabled: boolean }) {
	createTestingPinia({ createSpy: vi.fn, stubActions: false });
	const settingsStore = useSettingsStore();
	settingsStore.setSettings({
		...defaultSettings,
		aiAssistant: { enabled: aiAssistantEnabled, setup: aiAssistantEnabled },
	});

	return mount(AgentMemoryPanel, {
		props: {
			config: baseConfig(),
		},
	});
}

describe('AgentMemoryPanel', () => {
	it('enables episodic memory with managed credentials when AI Assistant is enabled', async () => {
		const wrapper = mountPanel({ aiAssistantEnabled: true });
		const uiStore = useUIStore();

		await wrapper.find('[data-testid="agent-episodic-memory-toggle"]').trigger('click');

		expect(uiStore.openModalWithData).not.toHaveBeenCalled();
		expect(wrapper.emitted('update:config')).toEqual([
			[
				{
					memory: {
						enabled: true,
						storage: 'n8n',
						episodicMemory: {
							enabled: true,
							credential: MANAGED_CREDENTIAL_TOKEN,
						},
					},
				},
			],
		]);
	});

	it('opens the credential selector when AI Assistant is disabled', async () => {
		const wrapper = mountPanel({ aiAssistantEnabled: false });
		const uiStore = useUIStore();

		await wrapper.find('[data-testid="agent-episodic-memory-toggle"]').trigger('click');

		expect(uiStore.openModalWithData).toHaveBeenCalledTimes(1);
		expect(wrapper.emitted('update:config')).toBeUndefined();
	});
});
