<script setup lang="ts">
import type { SimplifiedNodeType } from '@/Interface';
import NodeIcon from '@/app/components/NodeIcon.vue';
import DiffBadge from '@/features/workflows/workflowDiff/DiffBadge.vue';
import type { VersionNode } from '@n8n/rest-api-client/api/versions';
import type { NodeDiffStatus } from 'n8n-workflow';

import { ElDropdownItem } from 'element-plus';

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
	<ElDropdownItem
		:class="{
			'workflow-diff-node-item': true,
			'workflow-diff-node-item--compact': isCompact,
			'workflow-diff-node-item--active': isActive,
		}"
		@click.prevent="emit('select')"
	>
		<DiffBadge v-if="badgeType !== undefined" :type="badgeType" />
		<NodeIcon :node-type="nodeType" :size="16" class="ml-2xs mr-4xs" />
		<span :class="$style.nodeName">{{ nodeName }}</span>
	</ElDropdownItem>
</template>

<style module lang="scss">
:global(.el-dropdown-menu__item.workflow-diff-node-item) {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	border-radius: var(--radius--3xs);
	padding: var(--spacing--xs) var(--spacing--2xs);
	margin-right: var(--spacing--xs);
	line-height: unset;
	min-width: 0;
	transition: background-color 0.2s ease;

	&:hover {
		background-color: var(--color--background--light-3);
	}
}

:global(.el-dropdown-menu__item.workflow-diff-node-item.workflow-diff-node-item--compact) {
	padding: var(--spacing--5xs) 0;
}

:global(.el-dropdown-menu__item.workflow-diff-node-item.workflow-diff-node-item--active) {
	background-color: var(--color--background--light-3);
}

.nodeName {
	flex: 1;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}
</style>
