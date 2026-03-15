<script setup lang="ts">
import type { ChatArtifact } from '@n8n/api-types';
import { N8nIconButton, N8nSelect2 } from '@n8n/design-system';
import { computed } from 'vue';
import ChatMarkdownChunk from './ChatMarkdownChunk.vue';

const props = defineProps<{
	artifacts: ChatArtifact[];
	selectedIndex: number;
}>();

const emit = defineEmits<{
	close: [];
	selectArtifact: [title: number];
	download: [];
}>();

const selectedArtifact = computed(() => props.artifacts[props.selectedIndex] ?? props.artifacts[0]);

const options = computed(() =>
	props.artifacts.map((artifact, index) => ({
		value: index,
		label: artifact.title,
	})),
);

const isHtml = computed(() => selectedArtifact.value?.type === 'html');
const isMarkdown = computed(() => selectedArtifact.value?.type === 'md');
const markdownContent = computed(() => ({
	type: 'text' as const,
	content: isMarkdown.value
		? selectedArtifact.value?.content
		: `\`\`\`${selectedArtifact.value?.type}\n${selectedArtifact.value?.content}\n\`\`\``,
}));
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.viewer">
			<div :class="$style.header">
				<N8nSelect2
					:key="selectedArtifact?.title ?? '' /* workaround to keep title up-to-date */"
					:model-value="selectedIndex"
					size="medium"
					variant="ghost"
					:items="options"
					:class="$style.title"
					@update:model-value="emit('selectArtifact', $event)"
				/>
				<div :class="$style.headerActions">
					<N8nIconButton variant="ghost" text icon="download" @click="emit('download')" />
					<N8nIconButton variant="ghost" text icon="x" @click="emit('close')" />
				</div>
			</div>

			<div :class="$style.content">
				<iframe
					v-if="isHtml"
					:srcdoc="selectedArtifact?.content"
					:class="$style.iframe"
					sandbox=""
					:title="selectedArtifact?.title"
				/>

				<ChatMarkdownChunk
					v-else-if="markdownContent"
					ref="markdownChunk"
					:class="isMarkdown ? $style.markdown : ''"
					:single-pre="!isMarkdown"
					:source="markdownContent"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	height: 100%;
	width: 100%;
	display: flex;
	flex-direction: column;
	background-color: var(--color--background--light-2);
	border-left: var(--border-width) var(--border-style) var(--color--foreground);
	min-width: 0;
}

.viewer {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--4xs);
	padding-left: var(--spacing--4xs);
	padding-right: var(--spacing--xs);
	height: 56px;
	flex-grow: 0;
	flex-shrink: 0;
	border-bottom: var(--border);
	min-width: 0;
}

.markdown {
	padding-inline: var(--spacing--sm);
}

.title {
	flex-shrink: 1;
	color: var(--color--text);
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.headerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	flex-shrink: 0;
}

.type {
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

.content {
	flex: 1;
	overflow-x: hidden;
}

.iframe {
	width: 100%;
	height: 100%;
	border: none;
	background-color: var(--color--background);
}
</style>
