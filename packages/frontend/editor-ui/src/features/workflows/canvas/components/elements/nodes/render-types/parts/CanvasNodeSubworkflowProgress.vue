<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	progress: {
		currentNodeName?: string;
		currentNodeIndex: number;
		totalNodes: number;
		phase: 'running' | 'success' | 'error';
	};
}>();

const i18n = useI18n();

const percent = computed(() => {
	if (props.progress.totalNodes <= 0) return 0;
	const ratio = props.progress.currentNodeIndex / props.progress.totalNodes;
	return Math.max(0, Math.min(100, Math.round(ratio * 100)));
});

const countLabel = computed(() =>
	i18n.baseText('node.subworkflow.progress.count', {
		interpolate: {
			current: String(props.progress.currentNodeIndex),
			total: String(props.progress.totalNodes),
		},
	}),
);

const runningLabel = computed(() => {
	// Only label the node as "running" while it actually is. Between nodes
	// the store legitimately holds a `success`/`error` snapshot, but reading
	// that as "Running: X" would mislead the user.
	if (props.progress.phase !== 'running' || !props.progress.currentNodeName) return '';
	return i18n.baseText('node.subworkflow.progress.running', {
		interpolate: { nodeName: props.progress.currentNodeName },
	});
});
</script>

<template>
	<div :class="$style.container" data-test-id="canvas-subworkflow-progress">
		<div v-if="runningLabel" :class="$style.nodeName" :title="runningLabel">
			{{ runningLabel }}
		</div>
		<div :class="$style.counter">{{ countLabel }}</div>
		<div :class="$style.bar" :aria-label="countLabel">
			<div :class="$style.barFill" :style="{ width: `${percent}%` }" />
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--5xs);
	width: 100%;
	margin-top: var(--spacing--4xs);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--xs);
	line-height: var(--line-height--sm);
}

.nodeName {
	max-width: 100%;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	font-weight: var(--font-weight--medium);
}

.counter {
	font-variant-numeric: tabular-nums;
}

.bar {
	width: 80%;
	height: 3px;
	background: var(--color--foreground--tint-2);
	border-radius: var(--radius--full);
	overflow: hidden;
}

.barFill {
	height: 100%;
	background: var(--color--primary);
	transition: width 200ms ease-out;
}
</style>
