<script lang="ts" setup>
import type { NodeProps } from '@vue-flow/core';
import { computed, inject } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { ProjectContainerData } from '../canvas-types';
import { ProjectCanvasContextKey } from '../canvas-types';

const props = defineProps<NodeProps<ProjectContainerData>>();

const i18n = useI18n();
const context = inject(ProjectCanvasContextKey, null);

const isDropHot = computed(() => context?.dropHotId.value === props.data?.folderId);

const countLabel = computed(() =>
	i18n.baseText('projectCanvas.container.workflowCount', {
		interpolate: { count: String(props.data?.workflowCount ?? 0) },
	}),
);

function onHeaderPointerDown(event: PointerEvent) {
	if (event.button !== 0 || !props.data) return;
	event.stopPropagation();
	// click (no movement) collapses; dragging moves the whole container
	context?.onCardPointerDown(props.data.folderId, 'container', event);
}

function onHeaderContextMenu(event: MouseEvent) {
	event.preventDefault();
	event.stopPropagation();
	if (props.data) context?.onOpenContextMenu(props.data.folderId, 'container', event);
}

function onAddWorkflowClick(event: MouseEvent) {
	event.stopPropagation();
	if (props.data) context?.onAddWorkflow(props.data.folderId);
}

function onAddFolderClick(event: MouseEvent) {
	event.stopPropagation();
	if (props.data) context?.onAddFolder(props.data.folderId);
}
</script>

<template>
	<div
		class="project-canvas-container"
		:class="{ 'project-canvas-container--drop-hot': isDropHot }"
		:style="{ width: `${props.data?.width ?? 0}px`, height: `${props.data?.height ?? 0}px` }"
		:data-testid="`project-canvas-container-${props.data?.folderId}`"
	>
		<div
			class="project-canvas-container__head nopan"
			:title="i18n.baseText('projectCanvas.container.collapse')"
			@pointerdown="onHeaderPointerDown"
			@contextmenu="onHeaderContextMenu"
		>
			<N8nIcon icon="folder" :size="14" class="project-canvas-container__folder-icon" />
			<span class="project-canvas-container__name">{{ props.data?.name }}</span>
			<span class="project-canvas-container__count">{{ countLabel }}</span>
			<button
				class="project-canvas-container__action"
				:title="i18n.baseText('projectCanvas.create.workflowInFolder')"
				:data-testid="`project-canvas-container-add-workflow-${props.data?.folderId}`"
				@click="onAddWorkflowClick"
				@pointerdown.stop
			>
				<N8nIcon icon="plus" :size="13" />
			</button>
			<button
				class="project-canvas-container__action"
				:title="i18n.baseText('projectCanvas.create.subfolder')"
				:data-testid="`project-canvas-container-add-folder-${props.data?.folderId}`"
				@click="onAddFolderClick"
				@pointerdown.stop
			>
				<N8nIcon icon="folder-plus" :size="13" />
			</button>
			<span class="project-canvas-container__collapse">
				<N8nIcon icon="chevrons-down-up" :size="13" />
			</span>
		</div>
	</div>
</template>

<style scoped lang="scss">
.project-canvas-container {
	border: 1.5px dashed var(--color--foreground--shade-1);
	border-radius: var(--radius--xl);
	background: var(--color--black-alpha-50);
	animation: project-canvas-container-fadein 0.2s ease;
}

@keyframes project-canvas-container-fadein {
	from {
		opacity: 0;
	}
}

.project-canvas-container--drop-hot {
	border-color: var(--color--primary);
	background: var(--color--primary--tint-3);
}

.project-canvas-container__head {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 34px;
	display: flex;
	align-items: center;
	gap: 7px;
	padding: 0 10px 0 12px;
	cursor: pointer;
	color: var(--color--text);
	user-select: none;

	&:hover {
		color: var(--color--text--shade-1);
	}
}

.project-canvas-container__folder-icon {
	flex: none;
	color: var(--color--warning);
}

.project-canvas-container__name {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	letter-spacing: 0.07em;
	text-transform: uppercase;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.project-canvas-container__count {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
}

.project-canvas-container__action {
	all: unset;
	flex: none;
	width: 22px;
	height: 22px;
	border-radius: var(--radius--sm);
	display: grid;
	place-items: center;
	color: var(--color--text--tint-1);
	cursor: pointer;

	&:first-of-type {
		margin-left: auto;
	}

	&:hover {
		color: var(--color--text--shade-1);
		background: var(--color--background--light-3);
		box-shadow: inset 0 0 0 1px var(--color--foreground);
	}
}

.project-canvas-container__collapse {
	flex: none;
	width: 22px;
	height: 22px;
	border-radius: var(--radius--sm);
	display: grid;
	place-items: center;
	color: var(--color--text--tint-1);

	.project-canvas-container__head:hover & {
		color: var(--color--text--shade-1);
		background: var(--color--background--light-3);
		box-shadow: inset 0 0 0 1px var(--color--foreground);
	}
}
</style>
