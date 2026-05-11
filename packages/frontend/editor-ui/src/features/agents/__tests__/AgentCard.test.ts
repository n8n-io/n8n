/* eslint-disable import-x/no-extraneous-dependencies, @typescript-eslint/no-unsafe-assignment -- test-only patterns: @vue/test-utils is a transitive devDep, mock reads */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import type { AgentResource } from '../types';
import type { AgentPublishedVersion } from '../agent.types';

vi.mock('../composables/useAgentApi', () => ({
	deleteAgent: vi.fn(),
}));

vi.mock('../composables/useAgentConfirmationModal', () => ({
	useAgentConfirmationModal: () => ({ openAgentConfirmationModal: vi.fn() }),
}));

vi.mock('../composables/useAgentPublish', () => ({
	useAgentPublish: () => ({ publish: vi.fn(), unpublish: vi.fn() }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const agentPermissionsMock = {
	canCreate: ref(true),
	canUpdate: ref(true),
	canDelete: ref(true),
	canPublish: ref(true),
	canUnpublish: ref(true),
};

vi.mock('../composables/useAgentPermissions', () => ({
	useAgentPermissions: () => agentPermissionsMock,
}));

// First mount eats the SFC transform cost for AgentCard + deps; give the
// whole suite headroom.
vi.setConfig({ testTimeout: 30_000 });

const STUBS = {
	N8nCard: {
		template:
			'<div data-test-id="agent-card"><slot name="header" /><slot /><slot name="append" /></div>',
	},
	N8nText: { template: '<div :data-test-id="$attrs[\'data-test-id\']"><slot /></div>' },
	N8nBadge: {
		template: '<span :data-test-id="$attrs[\'data-test-id\']"><slot /></span>',
		props: ['theme', 'bold'],
	},
	N8nActionToggle: {
		name: 'N8nActionToggle',
		template:
			'<div :data-test-id="$attrs[\'data-test-id\']"><button v-for="a in actions" :key="a.value" :data-action="a.value">{{ a.label }}</button></div>',
		props: ['actions', 'theme'],
	},
	TimeAgo: { template: '<span />' },
};

const publishedVersion: AgentPublishedVersion = {
	schema: null,
	skills: null,
	publishedFromVersionId: 'v1',
	model: null,
	provider: null,
	credentialId: null,
	publishedById: null,
};

function createAgent(overrides: Partial<AgentResource> = {}): AgentResource {
	return {
		resourceType: 'agent',
		id: 'agent-1',
		name: 'My Agent',
		description: null,
		projectId: 'project-1',
		credentialId: null,
		provider: null,
		model: null,
		isCompiled: false,
		createdAt: '2026-01-01T00:00:00Z',
		updatedAt: '2026-01-01T00:00:00Z',
		versionId: 'v1',
		tools: {},
		skills: {},
		publishedVersion: null,
		...overrides,
	};
}

async function renderComponent(agent: AgentResource = createAgent()) {
	const { default: AgentCard } = await import('../components/AgentCard.vue');
	return mount(AgentCard, {
		props: { agent, projectId: 'project-1' },
		global: { stubs: STUBS },
	});
}

describe('AgentCard', () => {
	beforeEach(() => {
		agentPermissionsMock.canUpdate.value = true;
		agentPermissionsMock.canDelete.value = true;
		agentPermissionsMock.canPublish.value = true;
		agentPermissionsMock.canUnpublish.value = true;
	});

	it('hides the read-only badge when canUpdate is true', async () => {
		const wrapper = await renderComponent();
		expect(wrapper.find('[data-test-id="agent-card-readonly-badge"]').exists()).toBe(false);
	});

	it('shows the read-only badge when canUpdate is false', async () => {
		agentPermissionsMock.canUpdate.value = false;
		const wrapper = await renderComponent();

		const badge = wrapper.find('[data-test-id="agent-card-readonly-badge"]');
		expect(badge.exists()).toBe(true);
		expect(badge.text()).toBe('agents.list.readonly');
	});

	it('hides the action toggle when no scopes grant any action', async () => {
		agentPermissionsMock.canDelete.value = false;
		agentPermissionsMock.canPublish.value = false;
		agentPermissionsMock.canUnpublish.value = false;
		const wrapper = await renderComponent();

		expect(wrapper.find('[data-test-id="agent-card-actions"]').exists()).toBe(false);
	});

	it('shows Publish + Delete on an unpublished agent with full scopes', async () => {
		const wrapper = await renderComponent(createAgent({ publishedVersion: null }));

		expect(wrapper.find('[data-action="publish"]').exists()).toBe(true);
		expect(wrapper.find('[data-action="delete"]').exists()).toBe(true);
		expect(wrapper.find('[data-action="unpublish"]').exists()).toBe(false);
	});

	it('shows Unpublish + Delete on a published agent with full scopes', async () => {
		const wrapper = await renderComponent(createAgent({ publishedVersion }));

		expect(wrapper.find('[data-action="unpublish"]').exists()).toBe(true);
		expect(wrapper.find('[data-action="delete"]').exists()).toBe(true);
		expect(wrapper.find('[data-action="publish"]').exists()).toBe(false);
	});

	it('shows only Delete (no leading divider) when only canDelete is granted', async () => {
		agentPermissionsMock.canPublish.value = false;
		agentPermissionsMock.canUnpublish.value = false;
		const wrapper = await renderComponent();

		expect(wrapper.find('[data-action="delete"]').exists()).toBe(true);
		expect(wrapper.find('[data-action="publish"]').exists()).toBe(false);
		expect(wrapper.find('[data-action="unpublish"]').exists()).toBe(false);
	});

	it('hides Publish action when canPublish is false on an unpublished agent', async () => {
		agentPermissionsMock.canPublish.value = false;
		const wrapper = await renderComponent(createAgent({ publishedVersion: null }));

		expect(wrapper.find('[data-action="publish"]').exists()).toBe(false);
		expect(wrapper.find('[data-action="delete"]').exists()).toBe(true);
	});
});
