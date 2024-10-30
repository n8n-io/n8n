<script setup lang="ts">
import { computed } from 'vue';
import { useCanvasNode } from '@/composables/useCanvasNode';
import { useRouter } from 'vue-router';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';

const { name } = useCanvasNode();

const router = useRouter();
const workflowHelpers = useWorkflowHelpers({ router });
const workflow = computed(() => workflowHelpers.getCurrentWorkflow());
const node = computed(() => workflow.value.getNode(name.value));
</script>

<template>
	<div>
		<div
			v-if="node?.onError === 'continueRegularOutput' || node?.onError === 'continueErrorOutput'"
			data-test-id="canvas-node-status-execute-once"
			:class="[$style.status, $style.pinnedData]"
		>
			<FontAwesomeIcon icon="arrow-right" />
		</div>
		<div
			v-if="node?.retryOnFail"
			data-test-id="canvas-node-status-execute-once"
			:class="[$style.status, $style.pinnedData]"
		>
			<FontAwesomeIcon icon="retweet" />
		</div>
		<div
			v-if="node?.executeOnce"
			data-test-id="canvas-node-status-execute-once"
			:class="[$style.status, $style.pinnedData]"
		>
			<FontAwesomeIcon icon="dice-one" />
		</div>
		<div
			v-if="node?.alwaysOutputData"
			data-test-id="canvas-node-status-always-output-data"
			:class="[$style.status, $style.pinnedData]"
		>
			<FontAwesomeIcon icon="circle" />
		</div>
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
.node-waiting-spinner {
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 3.75em;
	color: hsla(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l), 0.7);
	width: 100%;
	height: 100%;
	position: absolute;
	left: -34px;
	top: -34px;
}

.issues {
	color: var(--color-danger);
	cursor: default;
}

.count {
	font-size: var(--font-size-s);
}
</style>
