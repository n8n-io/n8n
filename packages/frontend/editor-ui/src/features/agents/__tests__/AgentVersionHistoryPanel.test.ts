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

const unpublishMock = vi.fn().mockResolvedValue({ id: 'agent-1', name: 'My Agent' });

vi.mock('../composables/useAgentPublish', () => ({
	useAgentPublish: () => ({
		publish: vi.fn(),
		unpublish: unpublishMock,
		revertToPublished: vi.fn(),
		publishing: ref(false),
	}),
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
		props: ['items', 'actions', 'activeActions', 'hasMore', 'isInitialLoad', 'isLoading'],
	},
};

import AgentVersionHistoryPanel from '../components/VersionHistory/AgentVersionHistoryPanel.vue';

function mountPanel(props: Record<string, unknown> = {}) {
	return mount(AgentVersionHistoryPanel, {
		props: { projectId: 'project-1', agentId: 'agent-1', ...props },
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

describe('AgentVersionHistoryPanel — published-row actions', () => {
	beforeEach(() => {
		agentPermissionsMock.canUpdate.value = true;
		agentPermissionsMock.canPublish.value = true;
		agentPermissionsMock.canUnpublish.value = true;
		vi.clearAllMocks();
	});

	it('offers Revert and Unpublish on the published row, never Publish', async () => {
		const wrapper = mountPanel();
		await flushPromises();

		const list = wrapper.findComponent({ name: 'AgentVersionList' });
		const activeActions = list.props('activeActions') as Array<{ value: string }>;
		expect(activeActions.map((a) => a.value)).toEqual(['revert', 'unpublish']);
	});

	it('disables Revert when the draft already matches the published version', async () => {
		const wrapper = mountPanel({ hasUnpublishedChanges: false });
		await flushPromises();

		const list = wrapper.findComponent({ name: 'AgentVersionList' });
		const activeActions = list.props('activeActions') as Array<{
			value: string;
			disabled: boolean;
		}>;
		expect(activeActions.find((a) => a.value === 'revert')?.disabled).toBe(true);
	});

	it('enables Revert when the draft has unpublished changes', async () => {
		const wrapper = mountPanel({ hasUnpublishedChanges: true });
		await flushPromises();

		const list = wrapper.findComponent({ name: 'AgentVersionList' });
		const activeActions = list.props('activeActions') as Array<{
			value: string;
			disabled: boolean;
		}>;
		expect(activeActions.find((a) => a.value === 'revert')?.disabled).toBe(false);
	});

	it('omits Unpublish on the published row when the user cannot unpublish', async () => {
		agentPermissionsMock.canUnpublish.value = false;
		const wrapper = mountPanel();
		await flushPromises();

		const list = wrapper.findComponent({ name: 'AgentVersionList' });
		const activeActions = list.props('activeActions') as Array<{ value: string }>;
		expect(activeActions.map((a) => a.value)).toEqual(['revert']);
	});

	it('omits Revert on the published row when the user cannot update', async () => {
		agentPermissionsMock.canUpdate.value = false;
		const wrapper = mountPanel();
		await flushPromises();

		const list = wrapper.findComponent({ name: 'AgentVersionList' });
		const activeActions = list.props('activeActions') as Array<{ value: string }>;
		expect(activeActions.map((a) => a.value)).toEqual(['unpublish']);
	});

	it('reverts the published row through the same version-revert flow with its own version id', async () => {
		const updated = { id: 'agent-1', name: 'My Agent' };
		versionHistoryMock.revertToVersion.mockResolvedValueOnce(updated);
		const wrapper = mountPanel({ hasUnpublishedChanges: true });
		await flushPromises();

		const list = wrapper.findComponent({ name: 'AgentVersionList' });
		list.vm.$emit('action', { action: 'revert', versionId: 'v-active' });
		await flushPromises();

		expect(versionHistoryMock.revertToVersion).toHaveBeenCalledWith(
			'project-1',
			'agent-1',
			'v-active',
		);
		expect(wrapper.emitted('reverted')?.[0]).toEqual([updated]);
	});
});

describe('AgentVersionHistoryPanel — unpublish action', () => {
	beforeEach(() => {
		agentPermissionsMock.canUpdate.value = true;
		agentPermissionsMock.canPublish.value = true;
		agentPermissionsMock.canUnpublish.value = true;
		vi.clearAllMocks();
	});

	it('runs the unpublish flow and emits the updated agent', async () => {
		const updated = { id: 'agent-1', name: 'My Agent' };
		unpublishMock.mockResolvedValueOnce(updated);
		const wrapper = mountPanel({ agentName: 'My Agent' });
		await flushPromises();

		const list = wrapper.findComponent({ name: 'AgentVersionList' });
		list.vm.$emit('action', { action: 'unpublish', versionId: 'v-active' });
		await flushPromises();

		expect(unpublishMock).toHaveBeenCalledWith('project-1', 'agent-1', 'My Agent');
		expect(wrapper.emitted('unpublished')?.[0]).toEqual([updated]);
	});

	it('refreshes the version list after a successful unpublish', async () => {
		unpublishMock.mockResolvedValueOnce({ id: 'agent-1', name: 'My Agent' });
		const wrapper = mountPanel({ agentName: 'My Agent' });
		await flushPromises();
		versionHistoryMock.refresh.mockClear();

		const list = wrapper.findComponent({ name: 'AgentVersionList' });
		list.vm.$emit('action', { action: 'unpublish', versionId: 'v-active' });
		await flushPromises();

		expect(versionHistoryMock.refresh).toHaveBeenCalledWith('project-1', 'agent-1');
	});
});
