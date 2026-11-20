import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { AgentJsonLiveSourceConfig } from '@n8n/api-types';

import AgentLiveSourcesPanel from '../components/AgentLiveSourcesPanel.vue';

const resolveAgentLiveSourceLink = vi.fn();
vi.mock('../composables/useKnowledgeApi', () => ({
	resolveAgentLiveSourceLink: (...args: unknown[]) => resolveAgentLiveSourceLink(...args),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string | number> }) =>
			options?.interpolate ? `${key}:${Object.values(options.interpolate).join(',')}` : key,
	}),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest', pushRef: 'push-1' } }),
}));

const credentials = [
	{ id: 'cred-notion', name: 'Team workspace', type: 'notionApi' },
	{ id: 'cred-slack', name: 'Test workspace', type: 'slackApi' },
];
vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		fetchUsableCredentials: vi.fn().mockResolvedValue(credentials),
		getCredentialTypeByName: () => undefined,
		getCredentialById: (id: string) => credentials.find((credential) => credential.id === id),
	}),
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({ currentProject: null, personalProject: null, myProjects: [] }),
}));

const selectStub = {
	name: 'N8nSelect',
	props: ['modelValue', 'disabled', 'size'],
	emits: ['update:modelValue'],
	template:
		'<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
};
const optionStub = {
	name: 'N8nOption',
	props: ['value', 'label'],
	template: '<option :value="value">{{ label }}</option>',
};
const inputStub = {
	name: 'N8nInput',
	props: ['modelValue', 'disabled', 'size', 'placeholder'],
	emits: ['update:modelValue'],
	template:
		'<input :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />',
};
const credentialSelectStub = {
	name: 'AgentCredentialSelect',
	props: ['modelValue', 'credentials', 'disabled', 'loading'],
	emits: ['update:modelValue'],
	template: '<div :data-credential-count="credentials.length" />',
};

const source: AgentJsonLiveSourceConfig = {
	id: 'notion',
	provider: 'notion',
	name: 'Team workspace',
	credential: 'cred-notion',
	items: [
		{
			id: 'page-1',
			kind: 'item',
			containerType: 'page',
			title: 'Refund policy',
			url: 'https://notion.so/page-1',
		},
	],
};

function mountPanel(liveSources: AgentJsonLiveSourceConfig[] = []) {
	return mount(AgentLiveSourcesPanel, {
		props: { liveSources, projectId: 'project-1', agentId: 'agent-1' },
		global: {
			// N8nSelect and N8nOption declare no name, so VTU matches them by their file names.
			stubs: {
				N8nSelect: selectStub,
				Select: selectStub,
				N8nOption: optionStub,
				Option: optionStub,
				N8nInput: inputStub,
				AgentCredentialSelect: credentialSelectStub,
				CredentialIcon: true,
			},
		},
	});
}

describe('AgentLiveSourcesPanel', () => {
	beforeEach(() => vi.clearAllMocks());

	it('shows the empty hint and selects the only credential of the provider', async () => {
		const wrapper = mountPanel();
		await flushPromises();

		expect(wrapper.find('[data-testid="agent-live-sources-empty"]').exists()).toBe(true);
		expect(wrapper.findComponent(credentialSelectStub).props('modelValue')).toBe('cred-notion');
	});

	it('adds the resolved item as a source named after the credential', async () => {
		resolveAgentLiveSourceLink.mockResolvedValue({ item: source.items[0] });
		const wrapper = mountPanel();
		await flushPromises();

		await wrapper
			.find('[data-testid="agent-live-sources-link"]')
			.setValue(' https://notion.so/page-1 ');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(resolveAgentLiveSourceLink).toHaveBeenCalledWith(
			expect.anything(),
			'project-1',
			'agent-1',
			{ provider: 'notion', credential: 'cred-notion', url: 'https://notion.so/page-1' },
		);
		expect(wrapper.emitted('update:liveSources')).toEqual([[[source]]]);
		expect(wrapper.findComponent(inputStub).props('modelValue')).toBe('');
	});

	it('shows the unknown-link error and emits nothing when the link is not of the provider', async () => {
		resolveAgentLiveSourceLink.mockResolvedValue({ item: null });
		const wrapper = mountPanel();
		await flushPromises();

		await wrapper.find('[data-testid="agent-live-sources-link"]').setValue('https://example.com');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(wrapper.find('[data-testid="agent-live-sources-error"]').text()).toBe(
			'agents.builder.liveSources.form.unknownLink:agents.builder.liveSources.provider.notion',
		);
		expect(wrapper.emitted('update:liveSources')).toBeUndefined();
	});

	it('shows the server message when the source cannot be read', async () => {
		resolveAgentLiveSourceLink.mockRejectedValue(
			new Error('Knowledge source "notion" is unavailable: its credential does not exist'),
		);
		const wrapper = mountPanel();
		await flushPromises();

		await wrapper.find('[data-testid="agent-live-sources-link"]').setValue('https://notion.so/x');
		await wrapper.find('form').trigger('submit');
		await flushPromises();

		expect(wrapper.find('[data-testid="agent-live-sources-error"]').text()).toContain(
			'its credential does not exist',
		);
	});

	it('lists the picked items with their links and removes a source', async () => {
		const wrapper = mountPanel([source]);
		await flushPromises();

		const title = wrapper.find('[data-testid="agent-live-source-item-title"]');
		expect(title.text()).toBe('Refund policy');
		expect(title.attributes('href')).toBe('https://notion.so/page-1');

		await wrapper.find('[data-testid="agent-live-source-remove"]').trigger('click');

		expect(wrapper.emitted('update:liveSources')).toEqual([[[]]]);
	});

	it('writes the retrieval strategy of a source', async () => {
		const wrapper = mountPanel([source]);
		await flushPromises();

		await wrapper.find('[data-testid="agent-live-source-retrieval"]').setValue('index');

		expect(wrapper.emitted('update:liveSources')).toEqual([[[{ ...source, retrieval: 'index' }]]]);
	});
});
