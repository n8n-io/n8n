<script setup lang="ts">
import { computed } from 'vue';
import InteractiveSurface from './InteractiveSurface.vue';
import NodeBrand from './NodeBrand.vue';

const props = defineProps<{
	task: string;
	promptExcerpt: string;
	model?: string | null;
	tools?: string[];
	nodeId?: string | null;
	pressBound?: boolean;
}>();

defineEmits<{ press: [] }>();

const tools = computed(() => props.tools ?? []);
</script>

<template>
	<InteractiveSurface
		:node-id="nodeId"
		:label="task"
		:press-bound="pressBound"
		@press="$emit('press')"
	>
		<section :class="$style.task" data-test-id="ai-task">
			<header :class="$style.header">
				<NodeBrand :node-id="nodeId" :size="16" />
				<strong :class="$style.title">{{ task }}</strong>
				<span v-if="model" :class="$style.model" data-test-id="ai-task-model">{{ model }}</span>
			</header>
			<blockquote :class="$style.prompt" data-test-id="ai-task-prompt">
				{{ promptExcerpt }}
			</blockquote>
			<div v-if="tools.length" :class="$style.tools">
				<span :class="$style.toolsLabel">Tools</span>
				<span v-for="tool in tools" :key="tool" :class="$style.tool" data-test-id="ai-task-tool">
					{{ tool }}
				</span>
			</div>
		</section>
	</InteractiveSurface>
</template>

<style lang="scss" module>
.task {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-width: 0;
	padding: var(--spacing--sm);
	background: var(--background--subtle);
	border: var(--border);
	border-radius: var(--radius--lg);
}

.header {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.title {
	flex: 1;
	min-width: 0;
	color: var(--text-color);
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--lg);
}

.model {
	padding: var(--spacing--5xs) var(--spacing--2xs);
	color: var(--text-color--subtle);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--3xs);
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--full);
}

.prompt {
	margin: 0;
	padding: var(--spacing--xs);
	color: var(--text-color);
	font-size: var(--font-size--sm);
	font-style: italic;
	line-height: var(--line-height--xl);
	background: var(--background--surface);
	border-left: var(--spacing--4xs) solid var(--border-color--strong);
	border-radius: 0 var(--radius--sm) var(--radius--sm) 0;
	overflow-wrap: anywhere;
}

.tools {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--3xs);
}

.toolsLabel {
	color: var(--text-color--subtler);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	letter-spacing: var(--letter-spacing--wide);
	text-transform: uppercase;
}

.tool {
	padding: var(--spacing--5xs) var(--spacing--2xs);
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--3xs);
}
</style>
