<script setup lang="ts">
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import LogsOverviewRow from '@/features/logs/components/LogsOverviewRow.vue';
import type { LatestNodeInfo, LogEntry } from '@/features/logs/logs.types';
import type { IExecutionResponse } from '@/Interface';
import { useVirtualList } from '@vueuse/core';
import { watch } from 'vue';
import { nextTick } from 'vue';
import { computed, toRef } from 'vue';
import { useRouter } from 'vue-router';

const {
	isReadOnly,
	selected,
	isCompact,
	latestNodeInfo,
	flatLogEntries,
	shouldShowTokenCountColumn,
	execution,
} = defineProps<{
	selected?: LogEntry;
	isReadOnly: boolean;
	isCompact: boolean;
	shouldShowTokenCountColumn: boolean;
	canOpenNdv: boolean;
	flatLogEntries: LogEntry[];
	latestNodeInfo: Record<string, LatestNodeInfo>;
	execution?: IExecutionResponse;
}>();

const emit = defineEmits<{
	select: [LogEntry | undefined];
	openNdv: [LogEntry];
	toggleExpanded: [LogEntry];
}>();

const router = useRouter();
const runWorkflow = useRunWorkflow({ router });

const isExpanded = computed(() =>
	flatLogEntries.reduce<Record<string, boolean>>((acc, entry, index, arr) => {
		acc[entry.id] = arr[index + 1]?.parent?.id === entry.id;
		return acc;
	}, {}),
);
const virtualList = useVirtualList(
	toRef(() => flatLogEntries),
	{ itemHeight: 32 },
);

async function handleTriggerPartialExecution(treeNode: LogEntry) {
	const latestName = latestNodeInfo[treeNode.node.id]?.name ?? treeNode.node.name;

	if (latestName) {
		await runWorkflow.runWorkflow({ destinationNode: latestName });
	}
}

// While executing, scroll to the bottom if there's no selection
watch(
	[() => execution?.status === 'running', () => flatLogEntries.length],
	async ([isRunning, flatEntryCount], [wasRunning]) => {
		await nextTick(() => {
			if (selected === undefined && (isRunning || wasRunning)) {
				virtualList.scrollTo(flatEntryCount - 1);
			}
		});
	},
	{ immediate: true },
);

// Scroll selected row into view
watch(
	() => selected?.id,
	async (selectedId) => {
		await nextTick(() => {
			if (selectedId === undefined) {
				return;
			}

			const index = virtualList.list.value.some((e) => e.data.id === selectedId)
				? -1
				: flatLogEntries.findIndex((e) => e.id === selectedId);

			if (index >= 0) {
				virtualList.scrollTo(index);
			}
		});
	},
	{ immediate: true },
);
</script>

<template>
	<div :class="$style.tree" v-bind="virtualList.containerProps">
		<div role="tree" v-bind="virtualList.wrapperProps.value">
			<LogsOverviewRow
				v-for="{ data, index } of virtualList.list.value"
				:key="index"
				:data="data"
				:is-read-only="isReadOnly"
				:is-selected="data.id === selected?.id"
				:is-compact="isCompact"
				:should-show-token-count-column="shouldShowTokenCountColumn"
				:latest-info="latestNodeInfo[data.node.id]"
				:expanded="isExpanded[data.id]"
				:can-open-ndv="canOpenNdv"
				@toggle-expanded="emit('toggleExpanded', data)"
				@open-ndv="emit('openNdv', data)"
				@trigger-partial-execution="handleTriggerPartialExecution(data)"
				@toggle-selected="emit('select', selected?.id === data.id ? undefined : data)"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.tree {
	padding: 0 var(--spacing--2xs) var(--spacing--2xs) var(--spacing--2xs);
	/* For programmatically triggered scroll in useVirtualList to animate, make it scroll smoothly */
	scroll-behavior: smooth;

	.container:not(.staticScrollBar) & {
		scroll-padding-block: var(--spacing--3xs);

		@supports not (selector(::-webkit-scrollbar)) {
			scrollbar-width: thin;
		}

		@supports selector(::-webkit-scrollbar) {
			padding-right: var(--spacing--5xs);
			scrollbar-gutter: stable;

			&::-webkit-scrollbar {
				width: var(--spacing--4xs);
			}

			&::-webkit-scrollbar-thumb {
				border-radius: var(--spacing--4xs);
				background: var(--color--foreground--shade-1);
			}
		}
	}

	& :global(.el-icon) {
		display: none;
	}
}
</style>
