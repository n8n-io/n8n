<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import { usePagesWorkflowId } from '../composables/usePagesWorkflowId';
import { useWorkflowPagesProjectId } from '../composables/useWorkflowPagesProjectId';
import { useNodePagesStore } from '../nodePages.store';
import type { PagesResource } from '../resourcePages';
import ResourcePagesPopover from './ResourcePagesPopover.vue';

/**
 * Marks a canvas node that pages link to. A click lists the pages in a popover.
 * Renders nothing for a node without pages and for a workflow that is not saved.
 */
const props = defineProps<{
	nodeId: string;
	nodeName: string;
}>();

/** A count of one adds nothing to the icon. */
const SMALLEST_SHOWN_COUNT = 2;

const i18n = useI18n();
const nodePagesStore = useNodePagesStore();
const workflowId = usePagesWorkflowId();
const projectId = useWorkflowPagesProjectId();
const isOpen = ref(false);

const pages = computed(() =>
	workflowId.value === undefined ? [] : nodePagesStore.pagesOf(workflowId.value, props.nodeId),
);

const node = computed<PagesResource | undefined>(() =>
	workflowId.value === undefined || pages.value.length === 0
		? undefined
		: { resourceType: 'node', resourceId: props.nodeId, workflowId: workflowId.value },
);

const shownCount = computed(() =>
	pages.value.length >= SMALLEST_SHOWN_COUNT ? pages.value.length : undefined,
);

const title = computed(() =>
	i18n.baseText('page.node.button.title', { adjustToNumber: pages.value.length }),
);

function refreshWhenOpened(open: boolean): void {
	if (open && workflowId.value !== undefined) {
		void nodePagesStore.refresh(workflowId.value);
	}
}

watch(isOpen, refreshWhenOpened);
</script>

<template>
	<ResourcePagesPopover
		v-if="node"
		v-model:open="isOpen"
		:pages="pages"
		:resource="node"
		:resource-name="nodeName"
		:project-id="projectId"
		test-id-prefix="node-pages"
		side="top"
	>
		<template #trigger>
			<!-- `nodrag` and `nopan` keep a press on the badge from moving the node or the canvas. -->
			<button
				type="button"
				:class="[$style.badge, 'nodrag', 'nopan']"
				:title="title"
				:aria-label="title"
				data-test-id="node-pages-badge"
				@click.stop
				@dblclick.stop
			>
				<N8nIcon icon="file-text" size="xsmall" />
				<span v-if="shownCount" data-test-id="node-pages-count">{{ shownCount }}</span>
			</button>
		</template>
	</ResourcePagesPopover>
</template>

<style lang="scss" module>
.badge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--5xs);
	min-width: var(--spacing--md);
	height: var(--spacing--md);
	padding: 0 var(--spacing--4xs);
	border: var(--border);
	border-radius: var(--radius--full);
	background-color: var(--background--surface);
	color: var(--text-color--subtle);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	line-height: 1;
	cursor: pointer;

	&:hover,
	&:focus-visible {
		color: var(--color--primary);
		border-color: var(--color--primary);
		outline: none;
	}
}
</style>
