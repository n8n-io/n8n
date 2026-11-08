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
	hasLoadError: ref(false),
	refresh: vi.fn().mockResolvedValue(undefined),
	fetchMore: vi.fn(),
	retry: vi.fn(),
	revertToVersion: vi.fn(),
	publishVersion: vi.fn(),
	editVersion: vi.fn(),
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

const requestWriteAccessMock = vi.fn();

vi.mock('../stores/agentCollaboration.store', () => ({
	useAgentCollaborationStore: () => ({ requestWriteAccess: requestWriteAccessMock }),
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
	Tabs: {
		name: 'N8nTabs',
		template: '<div />',
		props: ['modelValue', 'options'],
		emits: ['update:modelValue'],
	},
	AgentPublishTimeline: {
		name: 'AgentPublishTimeline',
		template: '<div />',
		props: ['projectId', 'agentId'],
	},
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
		expect(actions.map((a) => a.value)).toEqual(['edit', 'revert', 'publish']);
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
		expect(actions.map((a) => a.value)).toEqual(['edit', 'revert']);
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

	it('does not run a history action while editing is locked', async () => {
		const wrapper = mountPanel({ editingLocked: true });
		await flushPromises();
		versionHistoryMock.revertToVersion.mockClear();
		wrapper
			.findComponent({ name: 'AgentVersionList' })
			.vm.$emit('action', { action: 'revert', versionId: 'v1' });
		await flushPromises();
		expect(versionHistoryMock.revertToVersion).not.toHaveBeenCalled();
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
		expect(activeActions.map((a) => a.value)).toEqual(['edit', 'revert', 'unpublish']);
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
		expect(activeActions.map((a) => a.value)).toEqual(['edit', 'revert']);
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

	it('requests the collaboration write lock before a mutating row action', async () => {
		const wrapper = mountPanel({ hasUnpublishedChanges: true });
		await flushPromises();

		const list = wrapper.findComponent({ name: 'AgentVersionList' });
		list.vm.$emit('action', { action: 'revert', versionId: 'v-active' });
		await flushPromises();

		expect(requestWriteAccessMock).toHaveBeenCalledTimes(1);
		expect(requestWriteAccessMock.mock.invocationCallOrder[0]).toBeLessThan(
			versionHistoryMock.revertToVersion.mock.invocationCallOrder[0],
		);
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

describe('AgentVersionHistoryPanel — history loading', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('refreshes history when a new draft version is saved', async () => {
		const wrapper = mountPanel({ currentVersionId: 'v1' });
		await flushPromises();
		versionHistoryMock.refresh.mockClear();
		await wrapper.setProps({ currentVersionId: 'v2' });
		expect(versionHistoryMock.refresh).toHaveBeenCalledWith('project-1', 'agent-1');
	});

	it('retries the failed history request', async () => {
		const wrapper = mountPanel();
		await flushPromises();
		versionHistoryMock.refresh.mockClear();
		wrapper.findComponent({ name: 'AgentVersionList' }).vm.$emit('retry');
		await flushPromises();
		expect(versionHistoryMock.retry).toHaveBeenCalledWith('project-1', 'agent-1');
		expect(versionHistoryMock.refresh).not.toHaveBeenCalled();
		expect(versionHistoryMock.fetchMore).not.toHaveBeenCalled();
	});
});

it('switches between Versions and Publish Timeline', async () => {
	const wrapper = mountPanel();
	await flushPromises();
	const tabs = wrapper.getComponent({ name: 'N8nTabs' });
	expect(tabs.props('options')).toEqual([
		{ value: 'versions', label: 'workflowHistory.tab.history' },
		{ value: 'timeline', label: 'workflowHistory.tab.publishTimeline' },
	]);
	tabs.vm.$emit('update:modelValue', 'timeline');
	await flushPromises();
	expect(wrapper.findComponent({ name: 'AgentVersionList' }).exists()).toBe(false);
	expect(wrapper.findComponent({ name: 'AgentPublishTimeline' }).props()).toMatchObject({
		projectId: 'project-1',
		agentId: 'agent-1',
	});
});

it('selects the requested tab and keeps tab changes in sync with its parent', async () => {
	const wrapper = mountPanel({ activeTab: 'timeline' });
	await flushPromises();
	expect(wrapper.findComponent({ name: 'AgentPublishTimeline' }).exists()).toBe(true);
	await wrapper.setProps({ activeTab: 'versions' });
	expect(wrapper.findComponent({ name: 'AgentVersionList' }).exists()).toBe(true);
	wrapper.getComponent({ name: 'N8nTabs' }).vm.$emit('update:modelValue', 'timeline');
	expect(wrapper.emitted('update:activeTab')).toEqual([['timeline']]);
});

it('checks update access again before editing version details', async () => {
	agentPermissionsMock.canUpdate.value = true;
	const wrapper = mountPanel();
	await flushPromises();
	const list = wrapper.findComponent({ name: 'AgentVersionList' });
	list.vm.$emit('action', { action: 'edit', versionId: 'v1' });
	await flushPromises();
	expect(versionHistoryMock.editVersion).toHaveBeenCalledWith('project-1', 'agent-1', 'v1');
	versionHistoryMock.editVersion.mockClear();
	agentPermissionsMock.canUpdate.value = false;
	list.vm.$emit('action', { action: 'edit', versionId: 'v1' });
	await flushPromises();
	expect(versionHistoryMock.editVersion).not.toHaveBeenCalled();
	wrapper.unmount();
});

describe('AgentVersionHistoryPanel — pending draft edits', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		agentPermissionsMock.canPublish.value = true;
	});

	it('flushes the draft before publishing the selected saved version', async () => {
		const flush = Promise.withResolvers<boolean>();
		const beforePublish = vi.fn().mockReturnValue(flush.promise);
		const wrapper = mountPanel({ beforePublish });
		await flushPromises();
		wrapper
			.findComponent({ name: 'AgentVersionList' })
			.vm.$emit('action', { action: 'publish', versionId: 'older-version' });
		expect(beforePublish).toHaveBeenCalled();
		expect(versionHistoryMock.publishVersion).not.toHaveBeenCalled();
		await wrapper.setProps({ currentVersionId: 'new-autosave' });
		flush.resolve(true);
		await flushPromises();
		expect(versionHistoryMock.publishVersion).toHaveBeenCalledWith(
			'project-1',
			'agent-1',
			'older-version',
		);
	});

	it.each(['failed-save', 'changed-agent'])('stops publication after %s', async (reason) => {
		const flush = Promise.withResolvers<boolean>();
		const wrapper = mountPanel({ beforePublish: () => flush.promise });
		await flushPromises();
		wrapper
			.findComponent({ name: 'AgentVersionList' })
			.vm.$emit('action', { action: 'publish', versionId: 'older-version' });
		if (reason === 'changed-agent') await wrapper.setProps({ agentId: 'agent-2' });
		flush.resolve(reason !== 'failed-save');
		await flushPromises();
		expect(versionHistoryMock.publishVersion).not.toHaveBeenCalled();
	});
});
