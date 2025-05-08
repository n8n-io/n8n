<script setup lang="ts">
import { computed } from 'vue';
import { useCanvasNode } from '@/composables/useCanvasNode';
import { useRouter } from 'vue-router';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useI18n } from '@/composables/useI18n';
import AlwaysOutputData from 'virtual:icons/mdi/arrow-right-circle';
import ExecuteOnce from 'virtual:icons/mdi/numeric-1-box';
import RetryOnFail from 'virtual:icons/mdi/repeat';
import ContinuesOnError from 'virtual:icons/material-symbols/tab-close-right';
const { name } = useCanvasNode();
const router = useRouter();
const i18n = useI18n();
const workflowHelpers = useWorkflowHelpers({ router });
const workflow = computed(() => workflowHelpers.getCurrentWorkflow());
const node = computed(() => workflow.value.getNode(name.value));
</script>

<template>
	<div>
		<N8nTooltip v-if="node?.alwaysOutputData">
			<template #content>
				{{ i18n.baseText('node.settings.alwaysOutputData') }}
			</template>
			<div
				data-test-id="canvas-node-status-always-output-data"
				:class="[$style.status, $style.pinnedData]"
			>
				<AlwaysOutputData />
			</div>
		</N8nTooltip>
		<N8nTooltip v-if="node?.executeOnce">
			<template #content>
				{{ i18n.baseText('node.settings.executeOnce') }}
			</template>
			<div
				data-test-id="canvas-node-status-execute-once"
				:class="[$style.status, $style.pinnedData]"
			>
				<ExecuteOnce />
			</div>
		</N8nTooltip>
		<N8nTooltip v-if="node?.retryOnFail">
			<template #content>
				{{ i18n.baseText('node.settings.retriesOnFailure') }}
			</template>
			<div
				data-test-id="canvas-node-status-retry-on-fail"
				:class="[$style.status, $style.pinnedData]"
			>
				<RetryOnFail />
			</div>
		</N8nTooltip>
		<N8nTooltip
			v-if="node?.onError === 'continueRegularOutput' || node?.onError === 'continueErrorOutput'"
		>
			<template #content>
				{{ i18n.baseText('node.settings.continuesOnError') }}
			</template>
			<div
				data-test-id="canvas-node-status-continue-on-error"
				:class="[$style.status, $style.pinnedData]"
			>
				<ContinuesOnError />
			</div>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.status {
	display: flex;
	align-items: center;
	gap: var(--spacing-5xs);
}
.runData {
	font-weight: 600;
	color: var(--color-success);
}
.waiting {
	color: var(--color-secondary);
}
.pinnedData {
	color: var(--color-text-light);
	font-size: var(--font-size-xs);
}
.running {
	width: calc(100% - 2 * var(--canvas-node--status-icons-offset));
	height: calc(100% - 2 * var(--canvas-node--status-icons-offset));
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 3.75em;
	color: hsla(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l), 0.7);
}
</style>
