<script lang="ts" setup>
import { computed, useCssModule } from 'vue';
import { useCanvasNode } from '../../../../composables/useCanvasNode';
import type { CanvasNodeDefaultRender } from '../../../../canvas.types';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { N8nTooltip, N8nIcon } from '@n8n/design-system';

const ICON_LIMIT = 3;

const $style = useCssModule();

const emit = defineEmits<{
	'open:contextmenu': [event: MouseEvent];
}>();

const { id, isSelected, render } = useCanvasNode();
const renderOptions = computed(() => render.value.options as CanvasNodeDefaultRender['options']);

const icons = computed(() => renderOptions.value.groupedIcons ?? []);
const nodeNames = computed(() => renderOptions.value.groupedNodeNames ?? []);
const groupName = computed(() => renderOptions.value.groupName ?? '');
const description = computed(() => renderOptions.value.groupDescription ?? '');
const isLoading = computed(() => renderOptions.value.groupDescriptionLoading ?? false);
const isConfiguration = computed(() => renderOptions.value.configuration ?? false);

const GROUP_COLORS: Array<{ value: string; border: string }> = [
	{ value: 'rgb(0 90 255 / 0.08)', border: 'rgb(100 160 255 / 0.4)' },
	{ value: 'rgb(130 80 255 / 0.08)', border: 'rgb(160 120 255 / 0.4)' },
	{ value: 'rgb(0 180 100 / 0.08)', border: 'rgb(60 200 130 / 0.4)' },
	{ value: 'rgb(255 140 0 / 0.08)', border: 'rgb(255 170 60 / 0.4)' },
	{ value: 'rgb(255 60 60 / 0.08)', border: 'rgb(255 100 100 / 0.4)' },
	{ value: 'rgb(0 180 180 / 0.08)', border: 'rgb(60 200 200 / 0.4)' },
];

const groupColorStyle = computed(() => {
	const c = renderOptions.value.groupColor;
	if (!c) return {};
	const match = GROUP_COLORS.find((gc) => gc.value === c);
	if (!match) return {};
	return {
		'--group-card--bg': match.value,
		'--group-card--border': match.border,
	};
});

const visibleIcons = computed(() => icons.value.slice(0, ICON_LIMIT));
const overflowCount = computed(() => Math.max(0, icons.value.length - ICON_LIMIT));

const classes = computed(() => ({
	[$style.group]: true,
	[$style.selected]: isSelected.value,
	[$style.configuration]: isConfiguration.value,
	[$style.colored]: !!renderOptions.value.groupColor,
}));

function openContextMenu(event: MouseEvent) {
	emit('open:contextmenu', event);
}

function onUngroupGroup() {
	window.dispatchEvent(new CustomEvent('ungroup-group', { detail: { groupId: id.value } }));
}

function onExpandGroup() {
	window.dispatchEvent(new CustomEvent('expand-group', { detail: { groupId: id.value } }));
}

function onRemoveNode(nodeName: string) {
	window.dispatchEvent(new CustomEvent('remove-node-from-group', { detail: { nodeName } }));
}
</script>

<template>
	<div
		:class="classes"
		:style="groupColorStyle"
		data-test-id="canvas-collapsed-group"
		@contextmenu="openContextMenu"
		@dblclick.stop="onExpandGroup"
	>
		<N8nIcon v-if="isLoading" icon="spinner" :class="$style.spinner" spin size="small" />
		<div v-if="groupName" :class="$style.title">{{ groupName }}</div>
		<div :class="$style.icons">
			<N8nTooltip v-for="(icon, idx) in visibleIcons" :key="idx" placement="top" :show-after="300">
				<template #content>
					{{ nodeNames[idx] ?? '' }}
				</template>
				<div :class="$style.iconBox">
					<NodeIcon :icon-source="icon" :size="20" :shrink="false" :disabled="false" />
				</div>
			</N8nTooltip>
			<div v-if="overflowCount > 0" :class="[$style.iconBox, $style.overflowBox]" @click.stop>
				<span :class="$style.overflow">+{{ overflowCount }}</span>
			</div>
		</div>
		<div v-if="description" :class="$style.description">
			{{ description }}
		</div>
	</div>
</template>

<style lang="scss" module>
.group {
	/* stylelint-disable-next-line @n8n/css-var-naming */
	--group-width: 220px;
	/* stylelint-disable-next-line @n8n/css-var-naming */
	--icon-box-size: 36px;

	position: relative;
	/* stylelint-disable-next-line @n8n/css-var-naming */
	width: var(--group-width);
	min-height: 60px;
	background: var(--canvas-node--color--background, var(--node--color--background));
	border: 2px dashed var(--color--foreground);
	border-radius: var(--radius--lg);
	padding: var(--spacing--xs);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	cursor: default;

	&.selected {
		/* stylelint-disable-next-line @n8n/css-var-naming */
		box-shadow: 0 0 0 calc(6px * var(--canvas-zoom-compensation-factor, 1))
			var(--canvas--color--selected-transparent);
	}

	&.configuration {
		/* stylelint-disable-next-line @n8n/css-var-naming */
		--group-width: 180px;
	}

	&.colored {
		/* stylelint-disable-next-line @n8n/css-var-naming */
		background: var(--group-card--bg);
		/* stylelint-disable-next-line @n8n/css-var-naming */
		border-color: var(--group-card--border);
	}
}

.title {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
}

.icons {
	display: flex;
	gap: var(--spacing--4xs);
}

.iconBox {
	position: relative;
	/* stylelint-disable-next-line @n8n/css-var-naming */
	width: var(--icon-box-size);
	/* stylelint-disable-next-line @n8n/css-var-naming */
	height: var(--icon-box-size);
	display: flex;
	align-items: center;
	justify-content: center;
	background: light-dark(var(--color--foreground), rgb(0 0 0 / 0.4));
	border-radius: var(--radius);
}

.overflowBox {
	cursor: default;
}

.overflow {
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
}

.spinner {
	position: absolute;
	top: var(--spacing--2xs);
	right: var(--spacing--2xs);
	color: var(--color--text--tint-2);
}

.description {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	line-height: var(--line-height--xl);
	word-wrap: break-word;
}
</style>
