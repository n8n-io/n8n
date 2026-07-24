/* eslint-disable import-x/no-extraneous-dependencies, @typescript-eslint/no-unsafe-assignment -- test-only patterns: @vue/test-utils is a transitive devDep, mock reads */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import type { AgentResource } from '../types';
import type { AgentVersion } from '../agent.types';

const { deleteAgentMock, openAgentConfirmationModalMock } = vi.hoisted(() => ({
	deleteAgentMock: vi.fn().mockResolvedValue(undefined),
	openAgentConfirmationModalMock: vi.fn(),
}));

vi.mock('../composables/useAgentApi', () => ({
	deleteAgent: deleteAgentMock,
}));

vi.mock('../composables/useAgentConfirmationModal', () => ({
	useAgentConfirmationModal: () => ({ openAgentConfirmationModal: openAgentConfirmationModalMock }),
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

const favoritesStoreMock = {
	isFavorite: vi.fn(() => false),
	toggleFavorite: vi.fn().mockResolvedValue(undefined),
	removeFavoriteLocally: vi.fn(),
};

vi.mock('@/app/stores/favorites.store', () => ({
	useFavoritesStore: () => favoritesStoreMock,
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
			'<div :data-test-id="$attrs[\'data-test-id\']"><button v-for="a in actions" :key="a.value" :data-action="a.value" @click="$emit(\'action\', a.value)">{{ a.label }}</button></div>',
		props: ['actions', 'theme'],
		emits: ['action'],
	},
	TimeAgo: { template: '<span />' },
};

const activeVersion: AgentVersion = {
	versionId: 'v1',
	schema: null,
	skills: null,
	author: 'Test User',
};

function createAgent(overrides: Partial<AgentResource> = {}): AgentResource {
	return {
		resourceType: 'agent',
		id: 'agent-1',
		name: 'My Agent',
		projectId: 'project-1',
		isCompiled: false,
		createdAt: '2026-01-01T00:00:00Z',
		updatedAt: '2026-01-01T00:00:00Z',
		versionId: 'v1',
		activeVersionId: null,
		tools: {},
		skills: {},
		activeVersion: null,
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
		favoritesStoreMock.isFavorite.mockReturnValue(false);
		favoritesStoreMock.toggleFavorite.mockClear();
		favoritesStoreMock.removeFavoriteLocally.mockClear();
		deleteAgentMock.mockClear();
		openAgentConfirmationModalMock.mockClear();
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

	it('shows only the favorite toggle when no scopes grant publish or delete', async () => {
		agentPermissionsMock.canDelete.value = false;
		agentPermissionsMock.canPublish.value = false;
		agentPermissionsMock.canUnpublish.value = false;
		const wrapper = await renderComponent();

		expect(wrapper.find('[data-test-id="agent-card-actions"]').exists()).toBe(true);
		expect(wrapper.find('[data-action="toggleFavorite"]').exists()).toBe(true);
		expect(wrapper.find('[data-action="publish"]').exists()).toBe(false);
		expect(wrapper.find('[data-action="unpublish"]').exists()).toBe(false);
		expect(wrapper.find('[data-action="delete"]').exists()).toBe(false);
	});

	it('shows Publish + Delete on an unpublished agent with full scopes', async () => {
		const wrapper = await renderComponent(createAgent({ activeVersionId: null }));

		expect(wrapper.find('[data-action="publish"]').exists()).toBe(true);
		expect(wrapper.find('[data-action="delete"]').exists()).toBe(true);
		expect(wrapper.find('[data-action="unpublish"]').exists()).toBe(false);
	});

	it('shows Unpublish + Delete on a published agent with full scopes', async () => {
		const wrapper = await renderComponent(createAgent({ activeVersionId: 'v1', activeVersion }));

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
		const wrapper = await renderComponent(createAgent({ activeVersionId: null }));

		expect(wrapper.find('[data-action="publish"]').exists()).toBe(false);
		expect(wrapper.find('[data-action="delete"]').exists()).toBe(true);
	});

	it('shows the favorite toggle action labeled "add" when the agent is not favorited', async () => {
		favoritesStoreMock.isFavorite.mockReturnValue(false);
		const wrapper = await renderComponent();

		expect(favoritesStoreMock.isFavorite).toHaveBeenCalledWith('agent-1', 'agent');
		const toggle = wrapper.find('[data-action="toggleFavorite"]');
		expect(toggle.exists()).toBe(true);
		expect(toggle.text()).toBe('favorites.add');
	});

	it('shows the favorite toggle action labeled "remove" when the agent is favorited', async () => {
		favoritesStoreMock.isFavorite.mockReturnValue(true);
		const wrapper = await renderComponent();

		const toggle = wrapper.find('[data-action="toggleFavorite"]');
		expect(toggle.exists()).toBe(true);
		expect(toggle.text()).toBe('favorites.remove');
	});

	it('toggles the favorite via the store when the toggle action is selected', async () => {
		favoritesStoreMock.isFavorite.mockReturnValue(false);
		const wrapper = await renderComponent();

		await wrapper.find('[data-action="toggleFavorite"]').trigger('click');

		expect(favoritesStoreMock.toggleFavorite).toHaveBeenCalledWith('agent-1', 'agent');
	});

	it('removes the agent from local favorites after a successful delete', async () => {
		openAgentConfirmationModalMock.mockResolvedValue('confirm');
		const wrapper = await renderComponent();

		await wrapper.find('[data-action="delete"]').trigger('click');

		expect(deleteAgentMock).toHaveBeenCalledWith({}, 'project-1', 'agent-1');
		expect(favoritesStoreMock.removeFavoriteLocally).toHaveBeenCalledWith('agent-1', 'agent');
		expect(wrapper.emitted('deleted')).toEqual([['agent-1']]);
	});
});
