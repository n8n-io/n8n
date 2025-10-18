<script setup lang="ts">
import { NodeDiffStatus } from '@/features/workflows/workflowDiff/useWorkflowDiff';
import { computed } from 'vue';
const props = defineProps<{
	type: NodeDiffStatus;
}>();

const label = computed(() => {
	switch (props.type) {
		case NodeDiffStatus.Added:
			return 'N';
		case NodeDiffStatus.Deleted:
			return 'D';
		case NodeDiffStatus.Modified:
			return 'M';
		default:
			return '';
	}
});

const backgroundColor = computed(() => {
	switch (props.type) {
		case NodeDiffStatus.Added:
			return 'var(--node--icon--color--green)';
		case NodeDiffStatus.Deleted:
			return 'var(--node--icon--color--red)';
		case NodeDiffStatus.Modified:
			return 'var(--node--icon--color--orange)';
		default:
			return '';
	}
});
</script>

<template>
	<div :class="$style.diffBadge">
		{{ label }}
	</div>
</template>

<style module>
.diffBadge {
	background-color: v-bind(backgroundColor);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	color: var(--color--text--tint-3);
	font-size: var(--font-size--3xs);
	font-weight: 700;
	width: 16px;
	height: 16px;
	border-radius: 4px;
	flex-shrink: 0;
}
</style>
