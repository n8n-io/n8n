import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentMemoryModelSetting from '../components/AgentMemoryModelSetting.vue';
import type { AgentJsonConfig } from '../types';

const credentialMocks = vi.hoisted(() => ({
	credentialsByProvider: {
		value: {
			anthropic: 'local-anthropic-credential',
			openai: 'local-openai-credential',
			'google-vertex': 'local-google-credential',
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

function mountSetting() {
	return mount(AgentMemoryModelSetting, {
		props: {
			config: makeConfig(),
			projectId: 'project-1',
		},
	});
}

describe('AgentMemoryModelSetting', () => {
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

	it.each([
		{
			selection: { provider: 'openai', model: 'gpt-5-mini' },
			worker: { model: 'openai/gpt-5-mini', credential: 'local-openai-credential' },
		},
		{
			selection: {
				provider: 'google-vertex',
				model: 'gemini-3-flash-preview',
				modelProjectId: 'cloud-project',
			},
			worker: {
				model: 'google-vertex/gemini-3-flash-preview',
				credential: 'local-google-credential',
				modelProjectId: 'cloud-project',
			},
		},
	])(
		'saves the model configuration when switching to $selection.provider',
		async ({ selection, worker }) => {
			const wrapper = mountSetting();
			const selector = wrapper.getComponent({ name: 'AgentModelSelector' });

			selector.vm.$emit('change', selection);
			await wrapper.vm.$nextTick();

			expect(wrapper.emitted('update:config')?.[0]?.[0]).toMatchObject({
				memory: {
					observationalMemory: {
						observerModel: worker,
						reflectorModel: worker,
					},
					episodicMemory: {
						credential: 'embedding-credential',
						reflectorModel: worker,
					},
				},
			});
		},
	);

	it('uses an explicitly selected credential and clears the saved Vertex project', async () => {
		const wrapper = mountSetting();
		const config = makeConfig();
		await wrapper.setProps({
			config: {
				...config,
				memory: {
					...config.memory,
					enabled: true,
					storage: 'n8n',
					episodicMemory: {
						...config.memory?.episodicMemory,
						enabled: true,
						credential: 'embedding-credential',
						reflectorModel: {
							model: 'google-vertex/saved-memory-model',
							credential: 'saved-memory-credential',
							modelProjectId: 'saved-project',
						},
					},
				},
			},
		});
		const selector = wrapper.getComponent({ name: 'AgentModelSelector' });

		selector.vm.$emit('select-credential', 'google-vertex', 'new-google-credential');
		selector.vm.$emit('change', {
			provider: 'google-vertex',
			model: 'new-memory-model',
			modelProjectId: '',
		});
		await wrapper.vm.$nextTick();

		expect(credentialMocks.selectCredential).toHaveBeenCalledWith(
			'google-vertex',
			'new-google-credential',
		);
		expect(wrapper.emitted('update:config')?.[0]?.[0]).toMatchObject({
			memory: {
				observationalMemory: {
					observerModel: { credential: 'new-google-credential', modelProjectId: '' },
					reflectorModel: { credential: 'new-google-credential', modelProjectId: '' },
				},
				episodicMemory: {
					credential: 'embedding-credential',
					reflectorModel: { credential: 'new-google-credential', modelProjectId: '' },
				},
			},
		});
	});
});
