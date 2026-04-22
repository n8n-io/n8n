/* eslint-disable import-x/no-extraneous-dependencies, @typescript-eslint/no-explicit-any -- test-only */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';

const fetchAllCredentials = vi.fn(async () => undefined);
const allUsableCredentialsByType = ref<
	Record<string, Array<{ id: string; name: string; type: string; updatedAt: string }>>
>({});
const $onAction = vi.fn(() => () => undefined);
const getCredentialTypeByName = vi.fn(() => ({ displayName: 'Slack API' }));
const allCredentials = ref<Array<{ id: string; name: string }>>([]);

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		fetchAllCredentials,
		allUsableCredentialsByType: allUsableCredentialsByType.value,
		getCredentialTypeByName,
		allCredentials: allCredentials.value,
		$onAction,
	}),
}));

const openNewCredential = vi.fn();
vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ openNewCredential }),
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({
		currentProject: { scopes: ['credential:create'] },
		personalProject: { scopes: ['credential:create'] },
	}),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (k: string, opts?: { interpolate?: Record<string, string> }) => {
			if (opts?.interpolate) return `${k}:${Object.values(opts.interpolate).join(',')}`;
			return k;
		},
	}),
}));

vi.mock('@n8n/permissions', () => ({
	getResourcePermissions: () => ({ credential: { create: true } }),
}));

import AskCredentialCard from '../components/interactive/AskCredentialCard.vue';

const baseProps = {
	purpose: 'Slack credential',
	credentialTypes: ['slackApi'],
	projectId: 'p1',
	agentId: 'a1',
};

function mountCard(props: Record<string, unknown> = {}) {
	return mount(AskCredentialCard, {
		props: { ...baseProps, ...props },
		global: {
			stubs: {
				N8nButton: {
					props: ['disabled', 'type', 'size', 'variant'],
					template:
						'<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"><slot/></button>',
				},
				N8nIcon: { template: '<i v-bind="$attrs"></i>', props: ['icon', 'size', 'color'] },
				N8nText: { template: '<span><slot/></span>', props: ['size', 'bold', 'color', 'tag'] },
				N8nInputLabel: {
					template: '<label><slot/></label>',
					props: ['label', 'bold', 'size', 'color'],
				},
				N8nSelect: {
					props: ['modelValue', 'disabled', 'placeholder'],
					emits: ['update:modelValue'],
					template:
						'<select :disabled="disabled" data-testid="ask-credential-select" :value="modelValue" @change="$emit(\'update:modelValue\', ($event.target as HTMLSelectElement).value)"><slot/></select>',
				},
				N8nOption: {
					props: ['label', 'value'],
					template: '<option :value="value">{{ label }}</option>',
				},
			},
		},
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	allUsableCredentialsByType.value = {};
	allCredentials.value = [];
});

describe('AskCredentialCard', () => {
	it('renders the empty state and exposes a "setup credential" button when no creds match', async () => {
		const wrapper = mountCard();
		await flushPromises();

		expect(wrapper.find('[data-testid="ask-credential-empty-state"]').exists()).toBe(true);
		const setupBtn = wrapper.find('[data-testid="ask-credential-setup-button"]');
		expect(setupBtn.exists()).toBe(true);
	});

	it('opens the credential modal when "setup credential" is clicked', async () => {
		const wrapper = mountCard();
		await flushPromises();

		await wrapper.find('[data-testid="ask-credential-setup-button"]').trigger('click');

		expect(openNewCredential).toHaveBeenCalledWith('slackApi', false, false, 'p1');
	});

	it('emits skipped: true when Cancel is pressed', async () => {
		const wrapper = mountCard();
		await flushPromises();

		await wrapper.find('[data-testid="ask-credential-skip"]').trigger('click');

		const emitted = wrapper.emitted('submit') as unknown[][];
		expect(emitted).toBeTruthy();
		expect(emitted[0][0]).toEqual({ skipped: true });
	});

	it('auto-selects the most recently updated credential and uses it when confirm is clicked', async () => {
		allUsableCredentialsByType.value = {
			slackApi: [
				{ id: 'cred-old', name: 'Old', type: 'slackApi', updatedAt: '2024-01-01' },
				{ id: 'cred-new', name: 'New', type: 'slackApi', updatedAt: '2025-06-01' },
			],
		};

		const wrapper = mountCard();
		await flushPromises();

		await wrapper.find('[data-testid="ask-credential-confirm"]').trigger('click');

		const emitted = wrapper.emitted('submit') as unknown[][];
		expect(emitted[0][0]).toEqual({ credentialId: 'cred-new', credentialName: 'New' });
	});

	it('emits the chosen credential when the confirm button is clicked', async () => {
		allUsableCredentialsByType.value = {
			slackApi: [{ id: 'cred-1', name: 'Acme Slack', type: 'slackApi', updatedAt: '2025-01-01' }],
		};

		const wrapper = mountCard();
		await flushPromises();

		await wrapper.find('[data-testid="ask-credential-confirm"]').trigger('click');

		const emitted = wrapper.emitted('submit') as unknown[][];
		expect(emitted[0][0]).toEqual({ credentialId: 'cred-1', credentialName: 'Acme Slack' });
	});

	it('does not emit when the confirm button is clicked while disabled', async () => {
		allUsableCredentialsByType.value = {
			slackApi: [{ id: 'cred-1', name: 'Acme Slack', type: 'slackApi', updatedAt: '2025-01-01' }],
		};

		const wrapper = mountCard({ disabled: true });
		await flushPromises();

		expect(wrapper.find('[data-testid="ask-credential-confirm"]').exists()).toBe(false);
	});

	it('renders the resolved credential name when given a resolvedValue with credentialName', async () => {
		const wrapper = mountCard({
			disabled: true,
			resolvedValue: { credentialId: 'cred-9', credentialName: 'Picked Slack' },
		});
		await flushPromises();
		expect(wrapper.text()).toContain('Picked Slack');
	});

	it('renders the "Skipped" label when the resolvedValue is { skipped: true }', async () => {
		const wrapper = mountCard({
			disabled: true,
			resolvedValue: { skipped: true },
		});
		await flushPromises();
		expect(wrapper.text()).toContain('Skipped');
	});

	it('subscribes to the credentials store on mount and unsubscribes on unmount', async () => {
		const unsubscribe = vi.fn();
		$onAction.mockReturnValueOnce(unsubscribe);

		const wrapper = mountCard();
		await flushPromises();
		await wrapper.find('[data-testid="ask-credential-setup-button"]').trigger('click');
		expect($onAction).toHaveBeenCalled();

		wrapper.unmount();
		expect(unsubscribe).toHaveBeenCalled();
	});
});
