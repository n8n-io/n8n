import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentMemoryModelSetting from '../components/AgentMemoryModelSetting.vue';
import type { AgentJsonConfig } from '../types';

const credentialMocks = vi.hoisted(() => ({
	credentialsByProvider: {
		value: {
			anthropic: 'local-anthropic-credential',
			openai: 'local-openai-credential',
			'azure-openai': 'azure-credential',
		},
	},
	selectCredential: vi.fn(),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@n8n/design-system', () => ({
	N8nText: { template: '<span><slot /></span>' },
}));

vi.mock('@n8n/stores/users.store', () => ({
	useUsersStore: () => ({ currentUserId: 'user-1' }),
}));

vi.mock('../composables/useAgentModelCredentials', () => ({
	useAgentModelCredentials: () => credentialMocks,
}));

vi.mock('../composables/useModelCatalog', () => ({
	useModelCatalog: () => ({
		ensureLoaded: vi.fn(),
		getModelsForPicker: vi.fn(() => ({
			anthropic: { models: [] },
			openai: { models: [] },
			'azure-openai': {
				models: [
					{
						provider: 'azure-openai',
						model: 'gpt-4o-mini',
						name: 'GPT-4o mini',
						metadata: { functionCalling: true, available: true },
					},
					{
						provider: 'azure-openai',
						model: 'gpt-4o',
						name: 'GPT-4o',
						metadata: { functionCalling: true, available: true },
					},
					{
						provider: 'azure-openai',
						model: 'My-Chat',
						catalogModelId: 'gpt-4.1',
						deploymentName: 'My-Chat',
						name: 'My-Chat (gpt-4.1)',
						metadata: { functionCalling: true, available: true },
					},
				],
			},
		})),
		isLoading: { value: false },
	}),
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
			boundCredentialId: { type: String, default: null },
			credentialModalAppendToBody: Boolean,
			disabled: Boolean,
		},
		emits: ['change', 'select-credential'],
	},
}));

function makeConfig(): AgentJsonConfig {
	return {
		name: 'Agent',
		model: 'anthropic/agent-model',
		credential: 'agent-credential',
		instructions: 'Help the user.',
		memory: {
			enabled: true,
			storage: 'n8n',
			observationalMemory: {
				enabled: true,
				observerModel: {
					model: 'anthropic/saved-memory-model',
					credential: 'saved-memory-credential',
				},
				reflectorModel: {
					model: 'anthropic/saved-memory-model',
					credential: 'saved-memory-credential',
				},
				observerThresholdTokens: 100,
			},
			episodicMemory: {
				enabled: true,
				credential: 'embedding-credential',
				reflectorModel: {
					model: 'anthropic/saved-memory-model',
					credential: 'saved-memory-credential',
				},
				topK: 8,
			},
		},
	};
}

function mountSetting(config: AgentJsonConfig = makeConfig()) {
	return mount(AgentMemoryModelSetting, {
		props: {
			config,
			projectId: 'project-1',
		},
	});
}

describe('AgentMemoryModelSetting', () => {
	it('saves and restores the Foundry deployment for each memory worker', async () => {
		const wrapper = mountSetting();
		const selector = wrapper.getComponent({ name: 'AgentModelSelector' });
		selector.vm.$emit('change', { provider: 'azure-openai', model: 'My-Chat' });
		await wrapper.vm.$nextTick();
		const changes = wrapper.emitted('update:config')?.[0]?.[0] as Partial<AgentJsonConfig>;
		const worker = {
			model: 'azure-openai/My-Chat',
			modelCatalogId: 'gpt-4.1',
			credential: 'azure-credential',
		};
		expect(changes.memory).toMatchObject({
			observationalMemory: { observerModel: worker, reflectorModel: worker },
			episodicMemory: { reflectorModel: worker },
		});
		expect(selector.props('selectedModel')).toMatchObject({
			model: 'My-Chat',
			name: 'My-Chat (gpt-4.1)',
		});
		await wrapper.setProps({ config: { ...makeConfig(), ...changes } });
		expect(selector.props('selectedModel')).toMatchObject({
			model: 'My-Chat',
			name: 'My-Chat (gpt-4.1)',
		});
	});

	it('matches a classic worker by model ID when its deployment has another model ID', () => {
		const wrapper = mountSetting({
			...makeConfig(),
			memory: {
				enabled: true,
				storage: 'n8n',
				episodicMemory: {
					enabled: true,
					credential: 'embedding-credential',
					reflectorModel: {
						model: 'azure-openai/gpt-4o',
						modelDeploymentName: 'gpt-4o-mini',
						credential: 'azure-credential',
					},
				},
			},
		});
		expect(
			wrapper.getComponent({ name: 'AgentModelSelector' }).props('selectedModel'),
		).toMatchObject({
			model: 'gpt-4o',
			name: 'GPT-4o',
		});
	});

	it('uses the persisted worker credential when changing models within its provider', async () => {
		const wrapper = mountSetting();
		const selector = wrapper.getComponent({ name: 'AgentModelSelector' });

		expect(selector.props('credentials')).toMatchObject({
			anthropic: 'saved-memory-credential',
			openai: 'local-openai-credential',
		});
		expect(selector.props('boundCredentialId')).toBe('saved-memory-credential');

		selector.vm.$emit('change', { provider: 'anthropic', model: 'new-memory-model' });
		await wrapper.vm.$nextTick();

		expect(wrapper.emitted('update:config')).toEqual([
			[
				{
					memory: {
						enabled: true,
						storage: 'n8n',
						observationalMemory: {
							enabled: true,
							observerModel: {
								model: 'anthropic/new-memory-model',
								credential: 'saved-memory-credential',
							},
							reflectorModel: {
								model: 'anthropic/new-memory-model',
								credential: 'saved-memory-credential',
							},
							observerThresholdTokens: 100,
						},
						episodicMemory: {
							enabled: true,
							credential: 'embedding-credential',
							reflectorModel: {
								model: 'anthropic/new-memory-model',
								credential: 'saved-memory-credential',
							},
							topK: 8,
						},
					},
				},
			],
		]);
	});

	it('uses the local credential when changing to a different provider', async () => {
		const wrapper = mountSetting();
		const selector = wrapper.getComponent({ name: 'AgentModelSelector' });

		selector.vm.$emit('change', { provider: 'openai', model: 'gpt-5-mini' });
		await wrapper.vm.$nextTick();

		expect(wrapper.emitted('update:config')?.[0]?.[0]).toMatchObject({
			memory: {
				observationalMemory: {
					observerModel: {
						model: 'openai/gpt-5-mini',
						credential: 'local-openai-credential',
					},
					reflectorModel: {
						model: 'openai/gpt-5-mini',
						credential: 'local-openai-credential',
					},
				},
				episodicMemory: {
					credential: 'embedding-credential',
					reflectorModel: {
						model: 'openai/gpt-5-mini',
						credential: 'local-openai-credential',
					},
				},
			},
		});
	});

	it('uses an explicitly selected credential for the next model update', async () => {
		const wrapper = mountSetting();
		const selector = wrapper.getComponent({ name: 'AgentModelSelector' });

		selector.vm.$emit('select-credential', 'anthropic', 'new-anthropic-credential');
		selector.vm.$emit('change', { provider: 'anthropic', model: 'new-memory-model' });
		await wrapper.vm.$nextTick();

		expect(credentialMocks.selectCredential).toHaveBeenCalledWith(
			'anthropic',
			'new-anthropic-credential',
		);
		expect(wrapper.emitted('update:config')?.[0]?.[0]).toMatchObject({
			memory: {
				observationalMemory: {
					observerModel: { credential: 'new-anthropic-credential' },
					reflectorModel: { credential: 'new-anthropic-credential' },
				},
				episodicMemory: {
					credential: 'embedding-credential',
					reflectorModel: { credential: 'new-anthropic-credential' },
				},
			},
		});
	});
});
