/* eslint-disable import-x/no-extraneous-dependencies, @typescript-eslint/no-explicit-any -- test-only */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';

const selectorState = vi.hoisted(() => ({
	selection: { provider: 'anthropic', model: 'claude-sonnet-4-5' },
}));

const credentialsByProvider = ref<Record<string, string> | undefined>({ anthropic: 'cred-1' });
const selectCredential = vi.fn();
const ensureLoaded = vi.fn();
const getModelsForPicker = vi.fn(() => ({
	anthropic: { models: [] },
}));
const isLoading = ref(false);
const personalProject = ref<{ id: string } | null>({ id: 'p1' });
const allCredentials = ref<Array<{ id: string; name: string }>>([
	{ id: 'cred-1', name: 'My Anthropic' },
]);
const currentUserId = ref('user-1');

vi.mock('@/features/settings/users/users.store', () => ({
	useUsersStore: () => ({
		get currentUserId() {
			return currentUserId.value;
		},
	}),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		get allCredentials() {
			return allCredentials.value;
		},
	}),
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({
		get personalProject() {
			return personalProject.value;
		},
	}),
}));

vi.mock('vue-router', async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>;
	return { ...actual, useRoute: () => ({ params: {} }) };
});

vi.mock('../composables/useModelCatalog', () => ({
	useModelCatalog: () => ({
		ensureLoaded,
		getModelsForPicker,
		isLoading,
	}),
}));

vi.mock('../composables/useAgentModelCredentials', () => ({
	useAgentModelCredentials: () => ({ credentialsByProvider, selectCredential }),
}));

vi.mock('../components/AgentModelSelector.vue', () => ({
	default: {
		name: 'AgentModelSelector',
		props: [
			'selectedModel',
			'credentials',
			'modelsByProvider',
			'isLoading',
			'warnMissingCredentials',
			'horizontal',
		],
		emits: ['change', 'select-credential'],
		setup(_props: unknown, { emit }: { emit: (event: string, payload: unknown) => void }) {
			return {
				selectModel: () => emit('change', selectorState.selection),
			};
		},
		template: '<div data-testid="model-selector" @click="selectModel" />',
	},
}));

import AskLlmCard from '../components/interactive/AskLlmCard.vue';

function mountCard(props: Record<string, unknown> = {}) {
	return mount(AskLlmCard, {
		props,
		global: {
			stubs: {
				N8nText: { template: '<span><slot/></span>', props: ['size', 'bold', 'color', 'tag'] },
				N8nIcon: { template: '<i v-bind="$attrs"></i>', props: ['icon', 'size', 'color'] },
			},
		},
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	selectorState.selection = { provider: 'anthropic', model: 'claude-sonnet-4-5' };
	credentialsByProvider.value = { anthropic: 'cred-1' };
	personalProject.value = { id: 'p1' };
	allCredentials.value = [{ id: 'cred-1', name: 'My Anthropic' }];
});

describe('AskLlmCard', () => {
	it('renders the purpose text', async () => {
		const wrapper = mountCard({ purpose: 'Pick a main model' });
		await flushPromises();
		expect(wrapper.text()).toContain('Pick a main model');
	});

	it('falls back to the default heading when no purpose is supplied', async () => {
		const wrapper = mountCard();
		await flushPromises();
		expect(wrapper.text()).toContain('Choose a model');
	});

	it('fetches the model catalog on mount', async () => {
		mountCard();
		await flushPromises();
		expect(ensureLoaded).toHaveBeenCalledWith('p1');
	});

	it('emits a complete resume payload when the model selector emits a change', async () => {
		const wrapper = mountCard();
		await flushPromises();

		await wrapper.find('[data-testid="model-selector"]').trigger('click');

		const emitted = wrapper.emitted('submit') as unknown[][];
		expect(emitted).toBeTruthy();
		expect(emitted[0][0]).toEqual({
			provider: 'anthropic',
			model: 'claude-sonnet-4-5',
			credentialId: 'cred-1',
			credentialName: 'My Anthropic',
		});
	});

	it('does NOT emit when disabled — guards against accidental commits in resolved state', async () => {
		const wrapper = mountCard({ disabled: true });
		await flushPromises();

		const selector = wrapper.find('[data-testid="model-selector"]');
		if (selector.exists()) await selector.trigger('click');

		expect(wrapper.emitted('submit')).toBeFalsy();
	});

	it('renders the resolved provider/model and credential name when given resolvedValue', async () => {
		const wrapper = mountCard({
			disabled: true,
			resolvedValue: {
				provider: 'anthropic',
				model: 'claude-sonnet-4-5',
				credentialId: 'cred-1',
				credentialName: 'My Anthropic',
			},
		});
		await flushPromises();

		const text = wrapper.text();
		expect(text).toContain('anthropic/claude-sonnet-4-5');
		expect(text).toContain('My Anthropic');
	});

	it('strips the "models/" prefix from Google model ids before emitting', async () => {
		selectorState.selection = { provider: 'google', model: 'models/gemini-2.5-pro' };
		credentialsByProvider.value = { google: 'cred-g' };
		allCredentials.value = [{ id: 'cred-g', name: 'My Google' }];

		const wrapper = mountCard();
		await flushPromises();

		await wrapper.find('[data-testid="model-selector"]').trigger('click');

		const emitted = wrapper.emitted('submit') as unknown[][];
		expect((emitted[0][0] as { model: string }).model).toBe('gemini-2.5-pro');
	});
});
