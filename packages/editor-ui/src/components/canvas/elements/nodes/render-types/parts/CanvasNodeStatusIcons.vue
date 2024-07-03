<script setup lang="ts">
import { computed } from 'vue';
import TitledList from '@/components/TitledList.vue';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useCanvasNode } from '@/composables/useCanvasNode';

const nodeHelpers = useNodeHelpers();

const {
	pinnedDataCount,
	hasPinnedData,
	issues,
	hasIssues,
	executionStatus,
	executionWaiting,
	hasRunData,
	runDataCount,
} = useCanvasNode();

const hideNodeIssues = computed(() => false); // @TODO Implement this
</script>

<template>
	<div :class="$style.canvasNodeStatusIcons">
		<div v-if="hasIssues && !hideNodeIssues" :class="$style.issues" data-test-id="node-issues">
			<N8nTooltip :show-after="500" placement="bottom">
				<template #content>
					<TitledList :title="`${$locale.baseText('node.issues')}:`" :items="issues" />
				</template>
				<FontAwesomeIcon icon="exclamation-triangle" />
			</N8nTooltip>
		</div>
		<div v-else-if="executionWaiting || executionStatus === 'waiting'" class="waiting">
			<N8nTooltip placement="bottom">
				<template #content>
					<div v-text="executionWaiting"></div>
				</template>
				<FontAwesomeIcon icon="clock" />
			</N8nTooltip>
		</div>
		<span
			v-else-if="hasPinnedData && !nodeHelpers.isProductionExecutionPreview.value"
			:class="$style.pinnedData"
		>
			<FontAwesomeIcon icon="thumbtack" />
			<span v-if="pinnedDataCount > 1" class="items-count"> {{ pinnedDataCount }}</span>
		</span>
		<span v-else-if="executionStatus === 'unknown'">
			<!-- Do nothing, unknown means the node never executed -->
		</span>
		<span v-else-if="hasRunData" :class="$style.runData">
			<FontAwesomeIcon icon="check" />
			<span v-if="runDataCount > 1" :class="$style.itemsCount"> {{ runDataCount }}</span>
		</span>
	</div>
</template>

<style lang="scss" module>
.canvasNodeStatusIcons {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: flex-end;
}

.runData {
	font-weight: 600;
	color: var(--color-success);
}

.pinnedData {
	color: var(--color-secondary);
}

.issues {
	color: var(--color-danger);
	cursor: default;
}

.itemsCount {
	font-size: var(--font-size-s);
}
</style>
