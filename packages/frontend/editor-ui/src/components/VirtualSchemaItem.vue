<script lang="ts" setup>
import { N8nTooltip } from '@n8n/design-system';
import TextWithHighlights from './TextWithHighlights.vue';
import { type IconName } from '@n8n/design-system/components/N8nIcon/icons';

type Props = {
	title?: string;
	path?: string;
	level?: number;
	depth?: number;
	expression?: string;
	value?: string;
	id: string;
	icon: IconName;
	collapsable?: boolean;
	nodeName?: string;
	nodeType?: string;
	highlight?: boolean;
	draggable?: boolean;
	collapsed?: boolean;
	search?: string;
	preview?: boolean;
	locked?: boolean;
	lockedTooltip?: string;
	runIndex?: number;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	click: [];
}>();
</script>

<template>
	<div class="schema-item" :class="{ draggable }" data-test-id="run-data-schema-item">
		<div class="toggle-container">
			<div v-if="collapsable" class="toggle" @click="emit('click')">
				<N8nIcon icon="chevron-down" :class="{ 'collapse-icon': true, collapsed }" />
			</div>
		</div>
		<div
			v-if="title"
			:data-name="title"
			:data-path="path"
			:data-depth="depth"
			:data-nest-level="level"
			:data-value="expression"
			:data-node-type="nodeType"
			:data-target="!locked && 'mappable'"
			:data-node-name="nodeName"
			:data-run-index="runIndex"
			class="pill"
			:class="{
				'pill--highlight': highlight,
				'pill--preview': preview,
				'pill--locked': locked,
			}"
			data-test-id="run-data-schema-node-name"
		>
			<N8nIcon class="type-icon" :icon="icon" size="small" />
			<TextWithHighlights class="title" :content="title" :search="props.search" />
		</div>

		<N8nTooltip v-if="locked" :disabled="!lockedTooltip" :popper-class="$style.tooltip">
			<template #content>
				<span v-n8n-html="lockedTooltip" />
			</template>
			<N8nIcon class="locked-icon" icon="lock" size="small" />
		</N8nTooltip>

		<TextWithHighlights
			data-test-id="run-data-schema-item-value"
			class="text"
			:content="value"
			:search="props.search"
		/>
	</div>
</template>

<style lang="css" scoped>
.schema-item {
	display: flex;
	margin-left: calc(var(--spacing-l) * v-bind(level));
	align-items: baseline;
	padding-bottom: var(--spacing-2xs);
}

.toggle-container {
	min-width: var(--spacing-l);
	min-height: 17px;
}

.toggle {
	cursor: pointer;
	display: flex;
	justify-content: center;
	cursor: pointer;
	font-size: var(--font-size-s);
	color: var(--color-text-light);
}

.pill {
	display: inline-flex;
	height: 24px;
	padding: 0 var(--spacing-3xs);
	border: 1px solid var(--color-foreground-light);
	border-radius: var(--border-radius-base);
	background-color: var(--color-background-xlight);
	font-size: var(--font-size-2xs);
	color: var(--color-text-dark);
	max-width: 50%;
	align-items: center;

	> *:not(:first-child) {
		margin-left: var(--spacing-3xs);
		padding-left: var(--spacing-3xs);
		border-left: 1px solid var(--color-foreground-light);
	}

	&.pill--preview {
		/* Cannot use CSS variable inside data URL, so instead switching based on data-theme and media query */
		--schema-preview-dashed-border: url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' viewBox='0 0 400 400' fill='none' rx='4' ry='4' stroke='%230000002A' stroke-width='2' stroke-dasharray='4%2c 4' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e");
		--schema-preview-dashed-border-dark: url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' viewBox='0 0 400 400' fill='none' rx='4' ry='4' stroke='%23FFFFFF2A' stroke-width='2' stroke-dasharray='4%2c 4' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e");
		color: var(--color-text-light);
		background-color: var(--color-run-data-background);
		border: none;
		max-width: calc(100% - var(--spacing-l));
		background-image: var(--schema-preview-dashed-border);

		.title {
			color: var(--color-text-light);
		}
	}
}

@media (prefers-color-scheme: dark) {
	body:not([data-theme]) .pill--preview {
		background-image: var(--schema-preview-dashed-border-dark);
	}
}

[data-theme='dark'] .pill--preview {
	background-image: var(--schema-preview-dashed-border-dark);
}

.draggable .pill.pill--highlight {
	color: var(--color-primary);
	border-color: var(--color-primary-tint-1);
	background-color: var(--color-primary-tint-3);
}

.draggable .pill.pill--highlight .type-icon {
	color: var(--color-primary);
}

.draggable .pill:not(.pill--locked) {
	cursor: grab;
}

.draggable .pill:not(.pill--locked):hover {
	background-color: var(--color-background-light);
	border-color: var(--color-foreground-base);
}

.type-icon {
	color: var(--color-text-light);
}

.locked-icon {
	color: var(--color-text-light);
	margin-left: var(--spacing-2xs);
}

.title {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: 1.5;
}

.text {
	font-weight: var(--font-weight-normal);
	font-size: var(--font-size-2xs);
	margin-left: var(--spacing-2xs);
	word-break: break-word;
}

.collapse-icon {
	transition: transform 0.2s cubic-bezier(0.19, 1, 0.22, 1);
}
.collapsed {
	transform: rotateZ(-90deg);
}

.tooltip {
	max-width: 260px;
}
</style>

<style lang="css" module>
.tooltip {
	max-width: 260px;
}
</style>
