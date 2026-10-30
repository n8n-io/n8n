<script lang="ts" setup>
import { N8nCallout, N8nAiActivityStepGroup } from '@n8n/design-system';
import type { InstanceAiAgentNode } from '@n8n/api-types';
import { computed, ref, watch } from 'vue';
import SubagentStepTimeline from './SubagentStepTimeline.vue';
import { getAgentSectionTitle } from '../builderAgents';
import { getAgentActivityKey } from '../builderAgents';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	agentNode: InstanceAiAgentNode;
}>();

const settingsStore = useSettingsStore();
const i18n = useI18n();

const isActive = computed(() => props.agentNode.status === 'active');
const isExpanded = ref(settingsStore.isCloudDeployment);

const isError = computed(() => props.agentNode.status === 'error');

const agentPreviewTarget = computed(() => {
	const target = props.agentNode.targetResource;
	if (target?.type !== 'agent' || !target.id || !target.projectId) return undefined;
	return { agentId: target.id, projectId: target.projectId };
});

const sectionTitle = computed(() => {
	const activityKey = getAgentActivityKey(props.agentNode);
	const activityTitle = activityKey ? i18n.baseText(activityKey) : undefined;
	return (
		getAgentSectionTitle(props.agentNode, activityTitle) ??
		i18n.baseText('instanceAi.agentActivity.working')
	);
});

/**
 * Most recent timeline entry that SubagentStepTimeline can render (text,
 * tool call, or reasoning), shown as a peek while collapsed and active.
 */
const peekEntries = computed(() => {
	const entries = props.agentNode.timeline;
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		if (entry.type === 'text' || entry.type === 'tool-call' || entry.type === 'reasoning') {
			return [entry];
		}
	}
	return [];
});

/** Collapse completed agents to restore the resting state. */
watch(
	() => props.agentNode.status,
	(status) => {
		if (status === 'completed') {
			isExpanded.value = false;
		}
	},
);
</script>

<template>
	<!-- eslint-disable vue/no-multiple-template-root -->
	<N8nAiActivityStepGroup
		v-model:open="isExpanded"
		:label="sectionTitle"
		:loading="isActive"
		:nested="false"
	>
		<template #collapsed-preview>
			<div v-if="isActive && peekEntries.length" :class="$style.content">
				<SubagentStepTimeline
					:agent-node="props.agentNode"
					:agent-preview-target="agentPreviewTarget"
					:visible-entries="peekEntries"
					peek
				/>
			</div>
		</template>
		<template #default>
			<div :class="$style.content">
				<SubagentStepTimeline
					:agent-node="props.agentNode"
					:agent-preview-target="agentPreviewTarget"
				/>
			</div>
		</template>
	</N8nAiActivityStepGroup>
	<!-- Error display -->
	<N8nCallout v-if="isError && props.agentNode.error" theme="danger">
		{{ props.agentNode.error }}
	</N8nCallout>
</template>

<style lang="scss" module>
.content {
	padding-left: var(--spacing--2xs);
	border-left: var(--border);
	margin-left: var(--spacing--xs);
}
</style>
