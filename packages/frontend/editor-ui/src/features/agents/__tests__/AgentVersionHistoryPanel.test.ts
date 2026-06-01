/* eslint-disable import-x/no-extraneous-dependencies, @typescript-eslint/no-unsafe-assignment -- test-only patterns */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const versionHistoryMock = {
	items: ref([]),
	isLoading: ref(false),
	isInitialLoad: ref(false),
	hasMore: ref(false),
	refresh: vi.fn().mockResolvedValue(undefined),
	fetchMore: vi.fn(),
	revertToVersion: vi.fn(),
	publishVersion: vi.fn(),
};

vi.mock('../composables/useAgentVersionHistory', () => ({
	useAgentVersionHistory: () => versionHistoryMock,
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

const STUBS = {
	N8nHeading: { template: '<div><slot /></div>' },
	N8nIconButton: {
		template: '<button @click="$emit(\'click\')" />',
		props: ['icon', 'type', 'size', 'title'],
		emits: ['click'],
	},
	AgentVersionList: {
		name: 'AgentVersionList',
		template: '<div data-testid="stub-version-list" />',
		props: ['items', 'actions', 'hasMore', 'isInitialLoad', 'isLoading'],
	},
};

import AgentVersionHistoryPanel from '../components/VersionHistory/AgentVersionHistoryPanel.vue';

function mountPanel() {
	return mount(AgentVersionHistoryPanel, {
		props: { projectId: 'project-1', agentId: 'agent-1' },
		global: { stubs: STUBS },
	});
}

describe('AgentVersionHistoryPanel — RBAC gating of row actions', () => {
	beforeEach(() => {
		agentPermissionsMock.canUpdate.value = true;
		agentPermissionsMock.canPublish.value = true;
		vi.clearAllMocks();
	});

	it('exposes both revert and publish actions when the user has update and publish scopes', async () => {
		const wrapper = mountPanel();
		await flushPromises();

		const list = wrapper.findComponent({ name: 'AgentVersionList' });
		const actions = list.props('actions') as Array<{ value: string }>;
		expect(actions.map((a) => a.value)).toEqual(['revert', 'publish']);
	});

	it('omits the revert action when the user cannot update', async () => {
		agentPermissionsMock.canUpdate.value = false;
		const wrapper = mountPanel();
		await flushPromises();

		const list = wrapper.findComponent({ name: 'AgentVersionList' });
		const actions = list.props('actions') as Array<{ value: string }>;
		expect(actions.map((a) => a.value)).toEqual(['publish']);
	});

	it('omits the publish action when the user cannot publish', async () => {
		agentPermissionsMock.canPublish.value = false;
		const wrapper = mountPanel();
		await flushPromises();

		const list = wrapper.findComponent({ name: 'AgentVersionList' });
		const actions = list.props('actions') as Array<{ value: string }>;
		expect(actions.map((a) => a.value)).toEqual(['revert']);
	});

	it('exposes no row actions for a read-only viewer', async () => {
		agentPermissionsMock.canUpdate.value = false;
		agentPermissionsMock.canPublish.value = false;
		const wrapper = mountPanel();
		await flushPromises();

		const list = wrapper.findComponent({ name: 'AgentVersionList' });
		const actions = list.props('actions') as Array<{ value: string }>;
		expect(actions).toEqual([]);
	});
});
