<script setup lang="ts">
import { computed, onMounted, toRef, watch } from 'vue';
import type { UserAction } from '@n8n/design-system';
import { N8nHeading, N8nIconButton, N8nTooltip } from '@n8n/design-system';
import type { IUser } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import { useAgentVersionHistory } from '../../composables/useAgentVersionHistory';
import { useAgentPermissions } from '../../composables/useAgentPermissions';
import { useAgentPublish } from '../../composables/useAgentPublish';
import type { AgentResource } from '../../types';
import AgentVersionList from './AgentVersionList.vue';
import type { AgentVersionAction } from './AgentVersionListItem.vue';

const props = defineProps<{
	projectId: string;
	agentId: string;
	// Whether the draft has diverged from the published version.
	hasUnpublishedChanges?: boolean;
	// Used only for the unpublish confirmation modal copy.
	agentName?: string;
}>();

const emit = defineEmits<{
	close: [];
	reverted: [agent: AgentResource];
	published: [agent: AgentResource];
	unpublished: [agent: AgentResource];
}>();

const i18n = useI18n();
const {
	items,
	isLoading,
	isInitialLoad,
	hasMore,
	refresh,
	fetchMore,
	revertToVersion,
	publishVersion,
} = useAgentVersionHistory();
const { unpublish } = useAgentPublish();

const { canUpdate, canPublish, canUnpublish } = useAgentPermissions(toRef(props, 'projectId'));

// Hide actions the user can't perform server-side.
const actions = computed<Array<UserAction<IUser>>>(() => {
	const result: Array<UserAction<IUser>> = [];
	if (canUpdate.value) {
		result.push({
			label: i18n.baseText('agents.versionHistory.item.actions.revert'),
			value: 'revert',
			disabled: false,
		});
	}
	if (canPublish.value) {
		result.push({
			label: i18n.baseText('agents.versionHistory.item.actions.publish'),
			value: 'publish',
			disabled: false,
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
			label: i18n.baseText('agents.versionHistory.item.actions.revert'),
			value: 'revert',
			disabled: !props.hasUnpublishedChanges,
		});
	}
	if (canUnpublish.value) {
		result.push({
			label: i18n.baseText('agents.versionHistory.item.actions.unpublish'),
			value: 'unpublish',
			disabled: false,
		});
	}
	return result;
});

onMounted(() => {
	void refresh(props.projectId, props.agentId);
});

watch(
	() => [props.projectId, props.agentId],
	() => {
		void refresh(props.projectId, props.agentId);
	},
);

async function onAction({ action, versionId }: { action: AgentVersionAction; versionId: string }) {
	if (action === 'revert') {
		const result = await revertToVersion(props.projectId, props.agentId, versionId);
		if (result) emit('reverted', result);
	} else if (action === 'publish') {
		const result = await publishVersion(props.projectId, props.agentId, versionId);
		if (result) emit('published', result);
	} else {
		// Unpublish reuses the shared publish flow (confirmation modal + toast +
		// telemetry); refresh the list ourselves since that flow doesn't own it.
		const result = await unpublish(props.projectId, props.agentId, props.agentName);
		if (result) {
			await refresh(props.projectId, props.agentId);
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
	refresh: () => refresh(props.projectId, props.agentId),
});
</script>

<template>
	<aside :class="$style.panel" data-test-id="agent-version-history-panel">
		<header :class="$style.header">
			<N8nHeading size="small" :bold="true">
				{{ i18n.baseText('agents.versionHistory.title') }}
			</N8nHeading>
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
			:items="items"
			:actions="actions"
			:active-actions="activeActions"
			:has-more="hasMore"
			:is-initial-load="isInitialLoad"
			:is-loading="isLoading"
			@action="onAction"
			@load-more="onLoadMore"
		/>
	</aside>
</template>

<style module lang="scss">
.panel {
	display: flex;
	flex-direction: column;
	width: 330px;
	min-width: 330px;
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
	border-color: var(--color--foreground--tint-2);
	flex-shrink: 0;
}

.closeButton {
	flex-shrink: 0;
	margin-right: var(--spacing--3xs);
}
</style>
