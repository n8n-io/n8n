<script setup lang="ts">
import { useExecutionHelpers } from '@/composables/useExecutionHelpers';
import { useI18n } from '@n8n/i18n';
import type { IRunDataDisplayMode } from '@/Interface';
import type { ITaskMetadata } from 'n8n-workflow';
import { computed } from 'vue';

const { trackOpeningRelatedExecution, resolveRelatedExecutionUrl } = useExecutionHelpers();
const i18n = useI18n();

const props = withDefaults(
	defineProps<{
		taskMetadata: ITaskMetadata;
		displayMode: IRunDataDisplayMode;
		inline?: boolean;
	}>(),
	{
		inline: false,
	},
);

const hasRelatedExecution = computed(() => {
	return Boolean(props.taskMetadata.subExecution ?? props.taskMetadata.parentExecution);
});

function getExecutionLinkLabel(task: ITaskMetadata): string | undefined {
	if (task.parentExecution) {
		return i18n.baseText('runData.openParentExecution', {
			interpolate: { id: task.parentExecution.executionId },
		});
	}

	if (task.subExecution) {
		if (props.taskMetadata.subExecutionsCount === 1) {
			return i18n.baseText('runData.openSubExecutionSingle');
		} else {
			return i18n.baseText('runData.openSubExecutionWithId', {
				interpolate: { id: task.subExecution.executionId },
			});
		}
	}

	return;
}
</script>

<template>
	<a
		v-if="hasRelatedExecution"
		:class="{ [$style.relatedExecutionInfo]: !inline }"
		data-test-id="related-execution-link"
		:href="resolveRelatedExecutionUrl(taskMetadata)"
		target="_blank"
		@click.stop="trackOpeningRelatedExecution(taskMetadata, displayMode)"
	>
		<N8nIcon icon="external-link" size="xsmall" />
		{{ getExecutionLinkLabel(taskMetadata) }}
	</a>
</template>

<style lang="scss" module>
.relatedExecutionInfo {
	font-size: var(--font-size-s);
	margin-left: var(--spacing-3xs);

	svg {
		padding-bottom: var(--spacing-5xs);
	}
}
</style>
