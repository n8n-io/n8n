import { MANAGED_CREDENTIAL_TOKEN } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';

import { defaultSettings } from '@/__tests__/defaults';
import { useSettingsStore } from '@/app/stores/settings.store';
import AgentMemoryPanel from '../components/AgentMemoryPanel.vue';
import type { AgentJsonConfig } from '../types';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('@n8n/design-system', () => ({
	N8nDialog: {
		template: '<div v-if="open"><slot /></div>',
		props: ['open'],
	},
	N8nDialogHeader: { template: '<div><slot /></div>' },
	N8nDialogTitle: { template: '<div><slot /></div>' },
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

vi.mock('@/features/credentials/components/CredentialPicker/CredentialPicker.vue', () => ({
	default: {
		name: 'CredentialPicker',
		template: '<div />',
		props: {
			credentialType: String,
			selectedCredentialId: { type: String, default: null },
			hideCreateNew: Boolean,
			teleported: Boolean,
			credentialModalAppendToBody: Boolean,
		},
		emits: ['credential-selected'],
	},
}));

vi.mock('../components/AgentModelSelector.vue', () => ({
	default: {
		name: 'AgentModelSelector',
		template: '<div />',
		props: {
			selectedModel: { type: Object, default: null },
			credentials: { type: Object, default: null },
			modelsByProvider: { type: Object, required: true },
			isLoading: Boolean,
			projectId: String,
			warnMissingCredentials: Boolean,
			credentialModalAppendToBody: Boolean,
		},
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

function mountPanel({
	proxyEnabled,
	config = baseConfig(),
}: {
	proxyEnabled: boolean;
	config?: AgentJsonConfig;
}) {
	createTestingPinia({ createSpy: vi.fn, stubActions: false });
	const settingsStore = useSettingsStore();
	settingsStore.setSettings({
		...defaultSettings,
		aiAssistant: { enabled: true, setup: true },
	});
	settingsStore.moduleSettings = {
		agents: {
			modules: [],
			knowledgeBaseEnabled: false,
			proxyEnabled,
		},
	};

	return mount(AgentMemoryPanel, {
		props: {
			config,
		},
	});
}

describe('AgentMemoryPanel', () => {
	it('enables episodic memory with managed credentials when the proxy is available', async () => {
		const wrapper = mountPanel({ proxyEnabled: true });

		await wrapper.find('[data-testid="agent-episodic-memory-toggle"]').trigger('click');

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

	it('opens memory settings without enabling episodic memory when the proxy is unavailable', async () => {
		const wrapper = mountPanel({ proxyEnabled: false });

		await wrapper.find('[data-testid="agent-episodic-memory-toggle"]').trigger('click');

		expect(wrapper.findComponent({ name: 'CredentialPicker' }).exists()).toBe(true);
		expect(wrapper.emitted('update:config')).toBeUndefined();
	});

	it('shows an OpenAI credential picker that allows creating a credential for self-hosting', async () => {
		const wrapper = mountPanel({ proxyEnabled: false });

		await wrapper.find('[data-testid="agent-memory-settings-button"]').trigger('click');

		const picker = wrapper.findComponent({ name: 'CredentialPicker' });
		expect(picker.props()).toMatchObject({
			credentialType: 'openAiApi',
			hideCreateNew: false,
			teleported: false,
			credentialModalAppendToBody: true,
		});
	});

	it('opens model credential flows above memory settings', async () => {
		const wrapper = mountPanel({ proxyEnabled: false });

		await wrapper.find('[data-testid="agent-memory-settings-button"]').trigger('click');

		expect(
			wrapper.findComponent({ name: 'AgentModelSelector' }).props('credentialModalAppendToBody'),
		).toBe(true);
	});

	it('enables episodic memory after selecting a self-hosted credential', async () => {
		const wrapper = mountPanel({ proxyEnabled: false });
		await wrapper.find('[data-testid="agent-episodic-memory-toggle"]').trigger('click');

		wrapper
			.findComponent({ name: 'CredentialPicker' })
			.vm.$emit('credential-selected', 'openai-credential');
		await wrapper.vm.$nextTick();

		expect(wrapper.emitted('update:config')).toEqual([
			[
				{
					memory: {
						enabled: true,
						storage: 'n8n',
						episodicMemory: {
							enabled: true,
							credential: 'openai-credential',
						},
					},
				},
			],
		]);
	});

	it('offers to replace a managed credential when the proxy is unavailable', async () => {
		const config = baseConfig();
		config.memory = {
			enabled: true,
			storage: 'n8n',
			episodicMemory: {
				enabled: true,
				credential: MANAGED_CREDENTIAL_TOKEN,
			},
		};
		const wrapper = mountPanel({ proxyEnabled: false, config });

		await wrapper.find('[data-testid="agent-memory-settings-button"]').trigger('click');

		const picker = wrapper.findComponent({ name: 'CredentialPicker' });
		expect(picker.props('selectedCredentialId')).toBeNull();

		picker.vm.$emit('credential-selected', 'replacement-credential');
		await wrapper.vm.$nextTick();

		expect(wrapper.emitted('update:config')?.[0]?.[0]).toMatchObject({
			memory: {
				episodicMemory: {
					enabled: true,
					credential: 'replacement-credential',
				},
			},
		});
	});

	it('shows the selected self-hosted credential in memory settings', async () => {
		const config = baseConfig();
		config.memory = {
			enabled: true,
			storage: 'n8n',
			episodicMemory: {
				enabled: true,
				credential: 'existing-credential',
			},
		};
		const wrapper = mountPanel({ proxyEnabled: false, config });

		await wrapper.find('[data-testid="agent-memory-settings-button"]').trigger('click');

		expect(wrapper.findComponent({ name: 'CredentialPicker' }).props('selectedCredentialId')).toBe(
			'existing-credential',
		);
	});

	it('hides the self-hosted credential picker when the proxy is available', async () => {
		const wrapper = mountPanel({ proxyEnabled: true });

		await wrapper.find('[data-testid="agent-memory-settings-button"]').trigger('click');

		expect(wrapper.findComponent({ name: 'CredentialPicker' }).exists()).toBe(false);
	});
});
