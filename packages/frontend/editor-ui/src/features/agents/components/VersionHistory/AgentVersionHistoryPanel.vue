<script setup lang="ts">
import { computed, onMounted, toRef, useTemplateRef, watch } from 'vue';
import type { UserAction } from '@n8n/design-system';
import { N8nTabs, N8nIconButton, N8nTooltip } from '@n8n/design-system';
import type { IUser } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import { useAgentVersionHistory } from '../../composables/useAgentVersionHistory';
import { useAgentPermissions } from '../../composables/useAgentPermissions';
import { useAgentPublish } from '../../composables/useAgentPublish';
import { useAgentCollaborationStore } from '../../stores/agentCollaboration.store';
import type { AgentResource } from '../../types';
import AgentPublishTimeline from './AgentPublishTimeline.vue';
import AgentVersionList from './AgentVersionList.vue';
import type { AgentVersionAction } from './AgentVersionListItem.vue';

const props = defineProps<{
	projectId: string;
	agentId: string;
	currentVersionId?: string | null;
	// Whether the draft has diverged from the published version.
	hasUnpublishedChanges?: boolean;
	// Used only for the unpublish confirmation modal copy.
	agentName?: string;
	// True when the collaboration write lock or artifact lock prevents
	// edits — disables revert/publish/unpublish actions to avoid requests
	// that can only fail with 409/423.
	editingLocked?: boolean;
	beforePublish?: () => Promise<boolean>;
}>();

const emit = defineEmits<{
	close: [];
	reverted: [agent: AgentResource];
	published: [agent: AgentResource];
	unpublished: [agent: AgentResource];
}>();

const i18n = useI18n();
const activeTab = defineModel<string>('activeTab', { default: 'versions' });
const tabs = computed(() => [
	{ value: 'versions', label: i18n.baseText('workflowHistory.tab.history') },
	{ value: 'timeline', label: i18n.baseText('workflowHistory.tab.publishTimeline') },
]);
const timeline = useTemplateRef<InstanceType<typeof AgentPublishTimeline>>('timeline');
const {
	items,
	isLoading,
	isInitialLoad,
	hasMore,
	hasLoadError,
	refresh,
	fetchMore,
	retry,
	revertToVersion,
	publishVersion,
	editVersion,
} = useAgentVersionHistory();
const { unpublish } = useAgentPublish();

const { canUpdate, canPublish, canUnpublish } = useAgentPermissions(toRef(props, 'projectId'));
const agentCollaborationStore = useAgentCollaborationStore();

// Hide actions the user can't perform server-side. Disable them while the
// collaboration write lock prevents edits so the user sees the button is
// unavailable rather than getting a 409/423 on click.
const actions = computed<Array<UserAction<IUser>>>(() => {
	const result: Array<UserAction<IUser>> = [];
	if (canUpdate.value) {
		result.push({
			label: i18n.baseText('agents.versionHistory.metadata.editTitle'),
			value: 'edit',
			disabled: Boolean(props.editingLocked),
		});
		result.push({
			label: i18n.baseText('agents.versionHistory.item.actions.revert'),
			value: 'revert',
			disabled: Boolean(props.editingLocked),
		});
	}
	if (canPublish.value) {
		result.push({
			label: i18n.baseText('agents.versionHistory.item.actions.publish'),
			value: 'publish',
			disabled: Boolean(props.editingLocked),
		});
	}
	return result;
});

// Actions for the currently-published row. Publish is dropped (the version is
// already active); Revert is disabled while the draft is still in sync, since
// it would be a no-op; Unpublish clears the active version. Same RBAC gating as
// the header dropdown.
const activeActions = computed<Array<UserAction<IUser>>>(() => {
	const result: Array<UserAction<IUser>> = [];
	if (canUpdate.value) {
		result.push({
			label: i18n.baseText('agents.versionHistory.metadata.editTitle'),
			value: 'edit',
			disabled: Boolean(props.editingLocked),
		});
		result.push({
			label: i18n.baseText('agents.versionHistory.item.actions.revert'),
			value: 'revert',
			disabled: Boolean(props.editingLocked) || !props.hasUnpublishedChanges,
		});
	}
	if (canUnpublish.value) {
		result.push({
			label: i18n.baseText('agents.versionHistory.item.actions.unpublish'),
			value: 'unpublish',
			disabled: Boolean(props.editingLocked),
		});
	}
	return result;
});

onMounted(() => {
	void refresh(props.projectId, props.agentId);
});

watch(
	() => [props.projectId, props.agentId, props.currentVersionId],
	() => {
		void refresh(props.projectId, props.agentId);
	},
);

async function onAction({ action, versionId }: { action: AgentVersionAction; versionId: string }) {
	if (props.editingLocked) return;
	if ((action === 'revert' || action === 'edit') && !canUpdate.value) return;
	if (action === 'publish' && !canPublish.value) return;
	if (action === 'unpublish' && !canUnpublish.value) return;
	// Acquire the write lock before any mutating version action — the lock
	// is lazy (acquired on first edit, released on inactivity), matching
	// the workflow collaboration pattern.
	agentCollaborationStore.requestWriteAccess();
	const { projectId, agentId } = props;
	const isCurrentAgent = () => projectId === props.projectId && agentId === props.agentId;
	if (action === 'edit') {
		await editVersion(projectId, agentId, versionId);
	} else if (action === 'revert') {
		const result = await revertToVersion(projectId, agentId, versionId);
		if (result && isCurrentAgent()) emit('reverted', result);
	} else if (action === 'publish') {
		if (props.beforePublish && !(await props.beforePublish())) return;
		if (!isCurrentAgent() || props.editingLocked) return;
		const result = await publishVersion(projectId, agentId, versionId);
		if (result && isCurrentAgent()) emit('published', result);
	} else {
		// Unpublish reuses the shared publish flow (confirmation modal + toast +
		// telemetry); refresh the list ourselves since that flow doesn't own it.
		const result = await unpublish(projectId, agentId, props.agentName);
		if (result && isCurrentAgent()) {
			await refresh(projectId, agentId);
			emit('unpublished', result);
		}
	}
}

function onLoadMore() {
	void fetchMore(props.projectId, props.agentId);
}

function onClose() {
	emit('close');
}

// Exposed so the parent view can re-fetch the list after publish/unpublish
// events from elsewhere in the editor (e.g. the header's publish button) —
// otherwise the green-dot indicator would lag the agent's actual state.
defineExpose({
	refresh: async () => {
		await refresh(props.projectId, props.agentId);
		await timeline.value?.refresh();
	},
});
</script>

<template>
	<aside :class="$style.panel" data-test-id="agent-version-history-panel">
		<header :class="$style.header">
			<N8nTabs v-model="activeTab" :options="tabs" size="small" data-test-id="agent-history-tabs" />
			<N8nTooltip :content="i18n.baseText('agents.versionHistory.close')">
				<N8nIconButton
					icon="x"
					variant="ghost"
					size="medium"
					:class="$style.closeButton"
					:title="i18n.baseText('agents.versionHistory.close')"
					data-test-id="agent-version-history-close"
					@click="onClose"
				/>
			</N8nTooltip>
		</header>

		<AgentVersionList
			v-if="activeTab === 'versions'"
			:items="items"
			:actions="actions"
			:active-actions="activeActions"
			:has-more="hasMore"
			:has-load-error="hasLoadError"
			:is-initial-load="isInitialLoad"
			:is-loading="isLoading"
			@action="onAction"
			@load-more="onLoadMore"
			@retry="retry(projectId, agentId)"
		/>
		<AgentPublishTimeline
			v-else
			:key="`${projectId}/${agentId}`"
			ref="timeline"
			:project-id="projectId"
			:agent-id="agentId"
		/>
	</aside>
</template>

<style module lang="scss">
.panel {
	display: flex;
	flex-direction: column;
	/* The design tokens have no sidebar width. Keep this panel inside narrow viewports. */
	--agent-history-width: 22rem;
	width: min(var(--agent-history-width), 100vw);
	max-width: 100%;
	flex-shrink: 0;
	height: 100%;
	background-color: var(--background--surface);
	border-left: var(--border);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--xs);
	border-bottom: var(--border);
	flex-shrink: 0;
}

.closeButton {
	flex-shrink: 0;
	margin-right: var(--spacing--3xs);
}
</style>
