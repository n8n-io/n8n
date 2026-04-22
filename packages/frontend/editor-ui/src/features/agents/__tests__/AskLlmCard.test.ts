/* eslint-disable import-x/no-extraneous-dependencies, @typescript-eslint/no-explicit-any -- test-only */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';

const credentialsByProvider = ref<Record<string, string> | undefined>({ anthropic: 'cred-1' });
const selectCredential = vi.fn();
const fetchAgents = vi.fn();
const agents = ref<Record<string, unknown>>({
	anthropic: { claude: 'claude-sonnet-4-5' },
	ollama: { llama: 'llama3' },
});
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

vi.mock('@/features/ai/chatHub/chat.store', () => ({
	useChatStore: () => ({
		fetchAgents,
		get agents() {
			return agents.value;
		},
	}),
}));

vi.mock('@/features/ai/chatHub/composables/useChatCredentials', () => ({
	useChatCredentials: () => ({ credentialsByProvider, selectCredential }),
}));

vi.mock('@/features/ai/chatHub/chat.utils', () => ({
	isLlmProviderModel: (selection: unknown) =>
		typeof selection === 'object' &&
		selection !== null &&
		'provider' in selection &&
		'model' in selection,
}));

vi.mock('@/features/ai/chatHub/components/ModelSelector.vue', () => ({
	default: {
		name: 'ModelSelector',
		props: [
			'selectedAgent',
			'includeCustomAgents',
			'credentials',
			'agents',
			'isLoading',
			'warnMissingCredentials',
			'horizontal',
		],
		emits: ['change', 'select-credential'],
		template:
			"<div data-testid=\"model-selector\" @click=\"$emit('change', { provider: 'anthropic', model: 'claude-sonnet-4-5' })\" />",
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
	credentialsByProvider.value = { anthropic: 'cred-1' };
	allCredentials.value = [{ id: 'cred-1', name: 'My Anthropic' }];
	agents.value = {
		anthropic: { claude: 'claude-sonnet-4-5' },
		ollama: { llama: 'llama3' },
	};
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

	it('fetches the model catalog on mount when credentials are available', async () => {
		mountCard();
		await flushPromises();
		expect(fetchAgents).toHaveBeenCalledWith({ anthropic: 'cred-1' });
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
		const wrapper = mount(AskLlmCard, {
			props: {},
			global: {
				stubs: {
					N8nText: { template: '<span><slot/></span>' },
					N8nIcon: { template: '<i></i>' },
					ModelSelector: {
						template:
							"<div data-testid=\"model-selector\" @click=\"$emit('change', { provider: 'google', model: 'models/gemini-2.5-pro' })\" />",
						emits: ['change', 'select-credential'],
					},
				},
			},
		});
		credentialsByProvider.value = { google: 'cred-g' };
		allCredentials.value = [{ id: 'cred-g', name: 'My Google' }];
		await flushPromises();

		await wrapper.find('[data-testid="model-selector"]').trigger('click');

		const emitted = wrapper.emitted('submit') as unknown[][];
		expect((emitted[0][0] as { model: string }).model).toBe('gemini-2.5-pro');
	});
});
