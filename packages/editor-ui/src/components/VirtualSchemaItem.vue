<script lang="ts" setup>
import TextWithHighlights from './TextWithHighlights.vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

type Props = {
	title?: string;
	path?: string;
	level?: number;
	depth?: number;
	expression?: string;
	value?: string;
	id: string;
	icon: string;
	collapsable?: boolean;
	nodeType?: string;
	highlight?: boolean;
	draggable?: boolean;
	collapsed?: boolean;
	search?: string;
	preview?: boolean;
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
				<FontAwesomeIcon icon="angle-down" :class="{ 'collapse-icon': true, collapsed }" />
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
			data-target="mappable"
			class="pill"
			:class="{ 'pill--highlight': highlight, 'pill--preview': preview }"
			data-test-id="run-data-schema-node-name"
		>
			<FontAwesomeIcon class="type-icon" :icon size="sm" />
			<TextWithHighlights class="title" :content="title" :search="props.search" />
		</div>
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
		border-style: dashed;
		border-width: 1.5px;

		.title {
			color: var(--color-text-light);
			border-left: 1.5px dashed var(--color-foreground-light);
		}
	}
}

.draggable .pill.pill--highlight {
	color: var(--color-primary);
	border-color: var(--color-primary-tint-1);
	background-color: var(--color-primary-tint-3);
}

.draggable .pill.pill--highlight .type-icon {
	color: var(--color-primary);
}

.draggable .pill {
	cursor: grab;
}

.draggable .pill:hover {
	background-color: var(--color-background-light);
	border-color: var(--color-foreground-base);
}

.type-icon {
	color: var(--color-text-light);
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
</style>
