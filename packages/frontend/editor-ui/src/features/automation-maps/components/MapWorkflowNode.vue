<script setup lang="ts">
import { N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { Handle, Position } from '@vue-flow/core';
import { computed } from 'vue';

import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import type { MapWorkflowNodeData } from '../automationMap.types';

const props = defineProps<{ data: MapWorkflowNodeData; selected?: boolean }>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();

const MAX_SERVICE_ICONS = 5;

const triggerTypes = computed(() => [
	...new Set(props.data.workflow.triggers.map((trigger) => trigger.nodeType)),
]);

const shownServices = computed(() => props.data.serviceNodeTypes.slice(0, MAX_SERVICE_ICONS));
const hiddenServiceCount = computed(
	() => props.data.serviceNodeTypes.length - shownServices.value.length,
);

const triggerSummary = computed(() =>
	props.data.workflow.triggers.map((trigger) => trigger.label).join(' · '),
);

const classes = computed(() => ({
	entry: props.data.isEntryPoint,
	selected: props.selected,
	missing: props.data.workflow.missing,
	inactive: !props.data.workflow.active && !props.data.workflow.missing,
	[`focus-${props.data.focus}`]: true,
	searchMiss: !props.data.matchesSearch,
}));
</script>

<template>
	<div :class="[$style.node, classes]" :data-test-id="`map-workflow-${data.workflow.id}`">
		<Handle type="target" :position="Position.Left" :class="$style.handle" />
		<div :class="$style.header">
			<div :class="$style.triggerIcons">
				<N8nTooltip v-if="triggerTypes.length > 0" :content="triggerSummary" placement="top">
					<span :class="$style.iconStack">
						<NodeIcon
							v-for="type in triggerTypes.slice(0, 2)"
							:key="type"
							:node-type="nodeTypesStore.getNodeType(type)"
							:size="20"
						/>
					</span>
				</N8nTooltip>
				<N8nIcon v-else icon="workflow" :size="20" :class="$style.fallbackIcon" />
			</div>
			<div :class="$style.title">
				<N8nText bold size="small" :class="$style.name">{{ data.workflow.name }}</N8nText>
				<N8nText v-if="triggerSummary" size="xsmall" color="text-light" :class="$style.trigger">
					<N8nIcon v-if="data.isEntryPoint" icon="zap" :size="10" />
					{{ triggerSummary }}
				</N8nText>
			</div>
			<N8nTooltip
				:content="
					data.workflow.active
						? i18n.baseText('automationMaps.workflow.active')
						: i18n.baseText('automationMaps.workflow.inactive')
				"
				placement="top"
			>
				<span :class="[$style.status, data.workflow.active ? $style.statusActive : '']" />
			</N8nTooltip>
		</div>
		<N8nText size="xsmall" color="text-base" :class="$style.summary">
			{{ data.summary || i18n.baseText('automationMaps.workflow.noDescription') }}
		</N8nText>
		<div :class="$style.footer">
			<span v-if="shownServices.length" :class="$style.services">
				<NodeIcon
					v-for="type in shownServices"
					:key="type"
					:node-type="nodeTypesStore.getNodeType(type)"
					:size="14"
				/>
				<span v-if="hiddenServiceCount > 0" :class="$style.more">+{{ hiddenServiceCount }}</span>
			</span>
			<span v-if="data.dataTableCount" :class="$style.tables">
				<N8nIcon icon="table" :size="12" />
				{{ data.dataTableCount }}
			</span>
			<span v-if="data.workflow.hasUnresolvedDynamicCall" :class="$style.dynamic">
				<N8nTooltip :content="i18n.baseText('automationMaps.workflow.dynamicCall')">
					<N8nIcon icon="git-branch" :size="12" />
				</N8nTooltip>
			</span>
			<span v-if="data.change" :class="[$style.change, $style[data.change]]">
				{{ i18n.baseText(`automationMaps.change.${data.change}`) }}
			</span>
		</div>
		<Handle type="source" :position="Position.Right" :class="$style.handle" />
	</div>
</template>

<style lang="scss" module>
.node {
	position: relative;
	width: 300px;
	height: 116px;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	background: var(--node--color--background, var(--color--background--light-3));
	border: 2px solid var(--node--border-color, var(--color--foreground--shade-2));
	border-radius: var(--radius--lg);
	transition:
		opacity 0.2s ease,
		border-color 0.2s ease,
		box-shadow 0.2s ease;
	cursor: pointer;

	&:hover {
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
	}

	&:global(.entry) {
		border-radius: 36px var(--radius--lg) var(--radius--lg) 36px;
		padding-left: var(--spacing--md);
	}

	&:global(.selected),
	&:global(.focus-focused) {
		border-color: var(--color--primary);
		box-shadow: 0 0 0 4px var(--color--primary--tint-2);
	}

	&:global(.focus-related) {
		border-color: var(--color--secondary);
	}

	&:global(.focus-dimmed),
	&:global(.searchMiss) {
		opacity: 0.25;
	}

	&:global(.missing) {
		border-style: dashed;
		background: var(--color--background--light-2);
	}

	&:global(.inactive) .name {
		color: var(--color--text--tint-1);
	}
}

.handle {
	opacity: 0;
	pointer-events: none;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.triggerIcons {
	flex-shrink: 0;
	display: flex;
	align-items: center;
}

.iconStack {
	display: inline-flex;
	gap: var(--spacing--5xs);
}

.fallbackIcon {
	color: var(--color--text--tint-1);
}

.title {
	display: flex;
	flex-direction: column;
	min-width: 0;
	flex: 1;
}

.name,
.trigger {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.trigger {
	display: flex;
	align-items: center;
	gap: var(--spacing--5xs);
}

.status {
	flex-shrink: 0;
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: var(--color--foreground--shade-1);
}

.statusActive {
	background: var(--color--success);
}

.summary {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	line-height: var(--line-height--md);
	flex: 1;
}

.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	min-height: 16px;
}

.services,
.tables,
.dynamic {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.more {
	font-size: var(--font-size--3xs);
}

.change {
	margin-left: auto;
	padding: 0 var(--spacing--4xs);
	border-radius: var(--radius);
	font-weight: var(--font-weight--bold);
	text-transform: uppercase;
	font-size: var(--font-size--3xs);
}

.modified {
	color: var(--color--warning--shade-1);
	background: var(--color--warning--tint-2);
}

.added {
	color: var(--color--success--shade-1);
	background: var(--color--success--tint-3);
}

.removed {
	color: var(--color--danger--shade-1);
	background: var(--color--danger--tint-4);
}
</style>
