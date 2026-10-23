<script setup lang="ts">
import type { SimplifiedNodeType } from '@/Interface';
import NodeIcon from '@/app/components/NodeIcon.vue';
import DiffBadge from '@/features/workflows/workflowDiff/DiffBadge.vue';
import type { VersionNode } from '@n8n/rest-api-client/api/versions';
import type { NodeDiffStatus } from 'n8n-workflow';

defineProps<{
	nodeType?: SimplifiedNodeType | VersionNode | null;
	nodeName?: string;
	isActive?: boolean;
	isCompact?: boolean;
	badgeType?: NodeDiffStatus;
}>();

const emit = defineEmits<{
	select: [];
}>();
</script>

<template>
	<button
		type="button"
		:class="{
			[$style.item]: true,
			[$style.compact]: isCompact,
			[$style.active]: isActive,
		}"
		@click="emit('select')"
	>
		<DiffBadge v-if="badgeType !== undefined" :type="badgeType" />
		<NodeIcon :node-type="nodeType" :size="16" class="ml-2xs mr-4xs" />
		<span :class="$style.nodeName">{{ nodeName }}</span>
	</button>
</template>

<style module lang="scss">
.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	border: 0;
	background: transparent;
	border-radius: var(--radius--3xs);
	padding: var(--spacing--xs) var(--spacing--2xs);
	margin-right: var(--spacing--xs);
	line-height: unset;
	min-width: 0;
	text-align: left;
	cursor: pointer;
	transition: background-color 0.2s ease;

	&:hover,
	&.active {
		background-color: var(--color--background--light-3);
	}
}

.compact {
	padding: var(--spacing--5xs) 0;
}

.nodeName {
	flex: 1;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
	overflow: hidden;
}
</style>
