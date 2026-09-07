<script setup lang="ts">
import { computed, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';
import DependencyPill from '@/app/components/DependencyPill.vue';
import { useDependencies } from '@/app/composables/useDependencies';

const props = defineProps<{
	workflowId: string;
}>();

const i18n = useI18n();
const { fetchDependencyCounts, getDependencyCounts } = useDependencies();

const callerCount = computed(() => getDependencyCounts(props.workflowId)?.workflowParent ?? 0);

watch(
	() => props.workflowId,
	async (workflowId) => {
		// An unsaved workflow has no id and no callers
		if (!workflowId) return;
		await fetchDependencyCounts([workflowId], 'workflow');
	},
	{ immediate: true },
);
</script>

<template>
	<DependencyPill
		v-if="callerCount > 0"
		resource-type="workflow"
		:resource-id="workflowId"
		:dependency-types="['workflowParent']"
		:tooltip="i18n.baseText('ndv.trigger.subWorkflow.usedBy.tooltip')"
		source="ndv"
		data-test-id="workflow-callers-dropdown"
	>
		<template #trigger>
			<a :class="$style.callersLink" data-test-id="workflow-callers-link">
				<N8nIcon icon="link" size="xsmall" />
				{{
					i18n.baseText('ndv.trigger.subWorkflow.usedBy', {
						adjustToNumber: callerCount,
						interpolate: { count: String(callerCount) },
					})
				}}
			</a>
		</template>
	</DependencyPill>
</template>

<style lang="scss" module>
.callersLink {
	font-size: var(--font-size--sm);
	cursor: pointer;

	svg {
		padding-bottom: var(--spacing--5xs);
	}
}
</style>
