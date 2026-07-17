<script lang="ts" setup>
import { Handle, Position } from '@vue-flow/core';
import type { NodeProps } from '@vue-flow/core';
import { computed, inject } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/src/components/N8nIcon/icons';
import { useI18n } from '@n8n/i18n';
import type { WorkflowTriggerType } from '@n8n/api-types';

import type { CanvasPressKind, ProjectNodeData } from '../canvas-types';
import { ProjectCanvasContextKey } from '../canvas-types';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';

const props = defineProps<NodeProps<ProjectNodeData>>();

const i18n = useI18n();
const context = inject(ProjectCanvasContextKey, null);

const isFolder = computed(() => props.data?.kind === 'folder');
const isWorkflow = computed(() => props.data?.kind === 'workflow');
const isCredential = computed(() => props.data?.kind === 'credential');
const isResource = computed(() => props.data?.kind === 'resource');

type TileTint = 'accent' | 'teal' | 'grey' | 'tool' | 'amber';

const TRIGGER_TILE: Record<WorkflowTriggerType, { icon: IconName; tint: TileTint }> = {
	chat: { icon: 'message-circle', tint: 'accent' },
	webhook: { icon: 'webhook', tint: 'accent' },
	schedule: { icon: 'clock', tint: 'teal' },
	slack: { icon: 'slack', tint: 'accent' },
	error: { icon: 'triangle-alert', tint: 'amber' },
	form: { icon: 'form', tint: 'teal' },
	mcp: { icon: 'server', tint: 'tool' },
	subworkflow: { icon: 'workflow', tint: 'grey' },
	manual: { icon: 'play', tint: 'grey' },
	none: { icon: 'play', tint: 'grey' },
};

const tile = computed<{ icon: IconName; tint: TileTint }>(() => {
	if (isFolder.value) return { icon: 'folder', tint: 'amber' };
	if (isResource.value) return { icon: 'globe', tint: 'teal' };
	if (props.data?.isToolTarget) return { icon: 'wrench', tint: 'tool' };
	return TRIGGER_TILE[props.data?.triggerType ?? 'subworkflow'];
});

/** Extract a readable service name from a node type like 'n8n-nodes-base.slack' → 'Slack'. */
const resourceSubtitle = computed(() => {
	const nt = props.data?.nodeType;
	if (!nt) return '';
	const parts = nt.split('.');
	return parts[parts.length - 1].replace(/^./, (c) => c.toUpperCase());
});

const subtitleLabel = computed(() => {
	const triggerType = props.data?.triggerType ?? 'subworkflow';
	if (props.data?.isToolTarget && triggerType === 'subworkflow') {
		return i18n.baseText('projectCanvas.trigger.toolWorkflow');
	}
	return i18n.baseText(`projectCanvas.trigger.${triggerType}`);
});

const folderSubtitle = computed(() => {
	const count = props.data?.workflowCount ?? 0;
	return count === 1
		? i18n.baseText('projectCanvas.folder.workflowInside')
		: i18n.baseText('projectCanvas.folder.workflowsInside', {
				interpolate: { count: String(count) },
			});
});

const isLifted = computed(() => context?.liftedId.value === props.id);
const isDropHot = computed(() => context?.dropHotId.value === props.id);
const isSelected = computed(() => props.selected ?? false);

const isInteractive = computed(() => isFolder.value || isWorkflow.value || isCredential.value);

function onPointerDown(event: PointerEvent) {
	if (event.button !== 0 || !isInteractive.value) return;
	event.stopPropagation();
	const kind: CanvasPressKind = isFolder.value
		? 'folder'
		: isCredential.value
			? 'credential'
			: 'workflow';
	context?.onCardPointerDown(props.id, kind, event);
}

function onAddWorkflowClick(event: MouseEvent) {
	event.stopPropagation();
	context?.onAddWorkflow(props.id);
}

function onContextMenu(event: MouseEvent) {
	if (!isInteractive.value) return;
	event.preventDefault();
	event.stopPropagation();
	const kind: CanvasPressKind = isFolder.value
		? 'folder'
		: isCredential.value
			? 'credential'
			: 'workflow';
	context?.onOpenContextMenu(props.id, kind, event);
}
</script>

<template>
	<!-- Credential: circular node with icon inside and name beneath -->
	<div
		v-if="isCredential"
		class="project-canvas-credential nopan"
		:class="{
			'project-canvas-credential--lifted': isLifted,
			'project-canvas-credential--drop-hot': isDropHot,
		}"
		:data-testid="`project-canvas-node-${props.id}`"
		:title="props.data?.name"
		@pointerdown="onPointerDown"
		@contextmenu="onContextMenu"
	>
		<Handle id="cred-left" type="target" :position="Position.Left" class="project-canvas-handle" />
		<Handle
			id="cred-right"
			type="source"
			:position="Position.Right"
			class="project-canvas-handle"
		/>
		<div class="project-canvas-credential__circle">
			<CredentialIcon :credential-type-name="props.data?.credentialType ?? null" :size="24" />
		</div>
		<div class="project-canvas-credential__name">{{ props.data?.name }}</div>
		<div
			v-if="(props.data?.credentialUsageCount ?? 0) > 0"
			class="project-canvas-credential__count"
		>
			{{ props.data?.credentialUsageCount }}
		</div>
	</div>

	<!-- Standard node: workflow / folder / resource -->
	<div
		v-else
		class="project-canvas-node nopan"
		:class="{
			'project-canvas-node--folder': isFolder,
			'project-canvas-node--workflow': isWorkflow,
			'project-canvas-node--resource': isResource,
			'project-canvas-node--lifted': isLifted,
			'project-canvas-node--drop-hot': isDropHot,
			'project-canvas-node--selected': isSelected,
		}"
		:data-testid="`project-canvas-node-${props.id}`"
		:title="props.data?.name"
		@pointerdown="onPointerDown"
		@contextmenu="onContextMenu"
	>
		<Handle
			id="target-left"
			type="target"
			:position="Position.Left"
			class="project-canvas-handle"
		/>
		<Handle id="target-top" type="target" :position="Position.Top" class="project-canvas-handle" />
		<Handle
			id="source-right"
			type="source"
			:position="Position.Right"
			class="project-canvas-handle"
		/>
		<Handle
			id="source-bottom"
			type="source"
			:position="Position.Bottom"
			class="project-canvas-handle"
		/>

		<div class="project-canvas-node__tile" :class="`project-canvas-node__tile--${tile.tint}`">
			<N8nIcon :icon="tile.icon" :size="19" />
		</div>

		<div class="project-canvas-node__meta">
			<div class="project-canvas-node__name">{{ props.data?.name }}</div>
			<div v-if="isWorkflow" class="project-canvas-node__sub">
				<span
					class="project-canvas-node__dot"
					:class="{ 'project-canvas-node__dot--active': props.data?.active }"
				/>
				<span>{{ subtitleLabel }}</span>
			</div>
			<div v-else-if="isResource" class="project-canvas-node__sub">
				{{ resourceSubtitle }}
			</div>
			<div v-else class="project-canvas-node__sub">{{ folderSubtitle }}</div>
		</div>

		<button
			v-if="isFolder"
			class="project-canvas-node__add"
			:title="i18n.baseText('projectCanvas.create.workflowInFolder')"
			:data-testid="`project-canvas-node-add-workflow-${props.id}`"
			@click="onAddWorkflowClick"
			@pointerdown.stop
		>
			<N8nIcon icon="plus" :size="14" />
		</button>
		<span v-if="isFolder" class="project-canvas-node__chev">
			<N8nIcon icon="chevron-right" :size="15" />
		</span>
		<span v-if="isFolder" class="project-canvas-node__count-pill">
			{{ props.data?.workflowCount ?? 0 }}
		</span>
	</div>
</template>

<style scoped lang="scss">
/* ---- circular credential node ---- */
.project-canvas-credential {
	position: relative;
	width: 216px;
	height: 80px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 4px;
	user-select: none;
	cursor: grab;
	transition: box-shadow 0.15s ease;

	&:hover .project-canvas-credential__circle {
		box-shadow: var(--shadow--md);
		border-color: var(--color--text--tint-1);
	}
}

.project-canvas-credential--lifted {
	cursor: grabbing;
	opacity: 0.93;
}

.project-canvas-credential__circle {
	width: 48px;
	height: 48px;
	border-radius: var(--radius--full);
	background: var(--color--background--light-3);
	border: var(--border-width) solid var(--color--foreground);
	box-shadow: var(--shadow--xs);
	display: grid;
	place-items: center;
	transition:
		box-shadow 0.15s ease,
		border-color 0.15s ease;
}

.project-canvas-credential__name {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 200px;
	text-align: center;
}

.project-canvas-credential__count {
	position: absolute;
	top: 6px;
	right: 30px;
	background: var(--color--warning);
	color: #fff;
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	padding: 1px 6px;
	border-radius: var(--radius--full);
	box-shadow: var(--shadow--xs);
}

/* ---- standard rectangular node ---- */
.project-canvas-node {
	position: relative;
	width: 216px;
	height: 80px;
	background: var(--color--background--light-3);
	border: var(--border-width) solid var(--color--foreground);
	border-radius: var(--radius--lg);
	box-shadow: var(--shadow--xs);
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--xs);
	cursor: grab;
	user-select: none;
	transition:
		box-shadow 0.15s ease,
		border-color 0.15s ease;

	&:hover {
		box-shadow: var(--shadow--md);
		border-color: var(--color--foreground--shade-1);
	}
}

.project-canvas-node--lifted {
	cursor: grabbing;
	box-shadow: var(--shadow--md);
	opacity: 0.93;
	transition: none;
}

.project-canvas-node--selected {
	border-color: var(--color--primary);
	box-shadow:
		0 0 0 2px var(--color--primary--tint-3),
		var(--shadow--xs);
}

.project-canvas-node--folder {
	cursor: pointer;
	background: var(--color--background--light-2);
	border-style: dashed;
	border-color: var(--color--foreground--shade-1);

	&:hover {
		border-color: var(--color--text--tint-1);
	}

	&.project-canvas-node--drop-hot {
		border-style: solid;
		border-color: var(--color--primary);
		box-shadow:
			0 0 0 3px var(--color--primary--tint-3),
			var(--shadow--md);
	}
}

.project-canvas-node--resource {
	cursor: default;
	background: var(--color--background--light-2);
	border-style: dashed;
	border-color: var(--color--foreground--shade-1);

	&:hover {
		border-color: var(--color--text--tint-1);
	}
}

.project-canvas-node__tile {
	flex: none;
	width: 38px;
	height: 38px;
	border-radius: var(--radius--md);
	display: grid;
	place-items: center;

	&--accent {
		background: var(--color--primary--tint-3);
		color: var(--color--primary);
	}

	&--teal {
		background: var(--color--success--tint-4);
		color: var(--color--success);
	}

	&--grey {
		background: var(--color--background--light-2);
		color: var(--color--text);
		box-shadow: inset 0 0 0 1px var(--color--foreground);
	}

	&--tool {
		background: var(--color--secondary--tint-2);
		color: var(--color--secondary);
	}

	&--amber {
		background: var(--color--warning--tint-2);
		color: var(--color--warning);
	}
}

.project-canvas-node__meta {
	min-width: 0;
	flex: 1;
}

.project-canvas-node__name {
	font-weight: var(--font-weight--bold);
	font-size: var(--font-size--2xs);
	color: var(--color--text--shade-1);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.project-canvas-node__sub {
	font-size: var(--font-size--3xs);
	color: var(--color--text);
	display: flex;
	align-items: center;
	gap: 5px;
	margin-top: 2px;
}

.project-canvas-node__dot {
	width: 6px;
	height: 6px;
	border-radius: var(--radius--full);
	background: var(--color--text--tint-1);
	flex: none;

	&--active {
		background: var(--color--success);
	}
}

.project-canvas-node__add {
	all: unset;
	flex: none;
	width: 22px;
	height: 22px;
	border-radius: var(--radius--sm);
	display: none;
	place-items: center;
	color: var(--color--text--tint-1);
	cursor: pointer;

	.project-canvas-node--folder:hover & {
		display: grid;
	}

	&:hover {
		color: var(--color--text--shade-1);
		background: var(--color--background--light-3);
		box-shadow: inset 0 0 0 1px var(--color--foreground);
	}
}

.project-canvas-node__chev {
	flex: none;
	color: var(--color--text--tint-1);
	display: flex;
	align-items: center;
	transition:
		transform 0.15s ease,
		color 0.15s ease;

	.project-canvas-node--folder:hover & {
		color: var(--color--text);
		transform: scale(1.15);
	}
}

.project-canvas-node__count-pill {
	position: absolute;
	top: -9px;
	right: -9px;
	background: var(--color--warning);
	color: #fff;
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	letter-spacing: 0.02em;
	padding: 2px 7px;
	border-radius: var(--radius--full);
	box-shadow: var(--shadow--xs);
	font-variant-numeric: tabular-nums;
}

.project-canvas-handle {
	opacity: 0;
	width: 1px;
	height: 1px;
	min-width: 0;
	min-height: 0;
	border: none;
	pointer-events: none;
}
</style>
