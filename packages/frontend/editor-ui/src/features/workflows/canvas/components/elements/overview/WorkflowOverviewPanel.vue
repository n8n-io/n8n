<script setup lang="ts">
// PROTOTYPE: a persistent "Overview" card pinned to the top-left of the canvas.
// Renders the workflow overview as markdown, supports inline editing (pencil),
// can be collapsed to a pill, and can mock-"generate" content for a chosen
// audience. All content is stored in localStorage (see useWorkflowOverview) and
// never written back to the real workflow.
import { computed, nextTick, ref, useTemplateRef } from 'vue';
import {
	N8nActionDropdown,
	N8nButton,
	N8nIconButton,
	N8nInput,
	N8nMarkdown,
	N8nText,
	type ActionDropdownItem,
} from '@n8n/design-system';

import { useWorkflowOverview } from './useWorkflowOverview';
import type { OverviewAudience } from './workflowOverviewContent';

const props = withDefaults(defineProps<{ readOnly?: boolean }>(), { readOnly: false });

const {
	isCollapsed,
	isGenerating,
	content,
	hasContent,
	audience,
	setContent,
	generate,
	toggleCollapsed,
} = useWorkflowOverview();

// PROTOTYPE labels (consts so they're not flagged as raw template text).
const titleLabel = 'Overview';
const emptyLabel = 'No overview yet.';
const generateLabel = 'Generate';
const regenerateLabel = 'Regenerate';
const generatingLabel = 'Generating…';
const editHint = '⌘/Ctrl + Enter to save · Esc to cancel';

const audienceLabel = computed(() =>
	audience.value === 'technical' ? 'Technical' : 'Non-technical',
);

const audienceItems: Array<ActionDropdownItem<OverviewAudience>> = [
	{ id: 'technical', label: 'Technical' },
	{ id: 'non-technical', label: 'Non-technical' },
];

function onGenerate(forAudience: OverviewAudience) {
	if (props.readOnly) return;
	if (isEditing.value) isEditing.value = false;
	generate(forAudience);
}

// Inline editing: pencil swaps the body to a markdown textarea.
const isEditing = ref(false);
const draft = ref('');
const editor = useTemplateRef<InstanceType<typeof N8nInput>>('editor');

function startEdit() {
	if (props.readOnly) return;
	draft.value = content.value;
	isEditing.value = true;
	void nextTick(() => editor.value?.focus());
}

function commitEdit() {
	if (!isEditing.value) return;
	isEditing.value = false;
	if (draft.value !== content.value) setContent(draft.value);
}

function cancelEdit() {
	isEditing.value = false;
}
</script>

<template>
	<div
		:class="$style.panel"
		data-test-id="workflow-overview-panel"
		@mousedown.stop
		@pointerdown.stop
		@click.stop
		@dblclick.stop
	>
		<div :class="$style.header">
			<div :class="$style.heading">
				<N8nText :class="$style.title" bold>{{ titleLabel }}</N8nText>
				<N8nText v-if="hasContent && !isEditing && !isCollapsed" size="xsmall" color="text-light">
					{{ audienceLabel }}
				</N8nText>
			</div>
			<div :class="$style.controls">
				<N8nActionDropdown
					v-if="!isCollapsed && hasContent && !isEditing && !readOnly"
					:items="audienceItems"
					placement="bottom-end"
					data-test-id="workflow-overview-regenerate"
					@select="onGenerate"
				>
					<template #activator>
						<N8nIconButton
							variant="ghost"
							icon="refresh-cw"
							size="small"
							:title="regenerateLabel"
							:aria-label="regenerateLabel"
							:loading="isGenerating"
						/>
					</template>
				</N8nActionDropdown>
				<N8nIconButton
					v-if="!isCollapsed && hasContent && !isEditing && !readOnly"
					variant="ghost"
					icon="pencil"
					size="small"
					title="Edit"
					aria-label="Edit overview"
					data-test-id="workflow-overview-edit"
					@click="startEdit"
				/>
				<N8nIconButton
					variant="ghost"
					:icon="isCollapsed ? 'plus' : 'minus'"
					size="small"
					:title="isCollapsed ? 'Expand' : 'Collapse'"
					:aria-label="isCollapsed ? 'Expand overview' : 'Collapse overview'"
					data-test-id="workflow-overview-collapse"
					@click="toggleCollapsed"
				/>
			</div>
		</div>

		<template v-if="!isCollapsed">
			<!-- Editing -->
			<div v-if="isEditing" :class="$style.editArea">
				<N8nInput
					ref="editor"
					v-model="draft"
					type="textarea"
					:autosize="{ minRows: 6, maxRows: 16 }"
					data-test-id="workflow-overview-editor"
					@blur="commitEdit"
					@keydown.enter.meta.stop.prevent="commitEdit"
					@keydown.enter.ctrl.stop.prevent="commitEdit"
					@keydown.esc.stop.prevent="cancelEdit"
				/>
				<N8nText size="xsmall" color="text-light">{{ editHint }}</N8nText>
			</div>

			<!-- Generating -->
			<div
				v-else-if="isGenerating"
				:class="$style.generating"
				data-test-id="workflow-overview-generating"
			>
				<span :class="$style.skeletonLine" />
				<span :class="[$style.skeletonLine, $style.skeletonShort]" />
				<span :class="$style.skeletonLine" />
				<N8nText size="small" color="text-light">{{ generatingLabel }}</N8nText>
			</div>

			<!-- View (has content) -->
			<div v-else-if="hasContent" :class="$style.body" @wheel.stop>
				<N8nMarkdown :content="content" />
			</div>

			<!-- Empty -->
			<div v-else :class="$style.empty" data-test-id="workflow-overview-empty">
				<N8nText size="small" color="text-light">{{ emptyLabel }}</N8nText>
				<N8nActionDropdown
					v-if="!readOnly"
					:items="audienceItems"
					placement="bottom-start"
					data-test-id="workflow-overview-generate"
					@select="onGenerate"
				>
					<template #activator>
						<N8nButton variant="subtle" icon="sparkles" size="small" :label="generateLabel" />
					</template>
				</N8nActionDropdown>
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: 570px;
	max-width: calc(100vw - var(--spacing--2xl));
	padding: var(--spacing--xs) var(--spacing--sm);
	box-sizing: border-box;
	background: var(--color--background--light-2);
	border: var(--border);
	border-radius: var(--radius--lg);
	box-shadow: var(--shadow--sm);
	overflow: hidden;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.heading {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.title {
	font-size: var(--font-size--sm);
}

.controls {
	display: flex;
	align-items: center;
	gap: var(--spacing--5xs);
	flex-shrink: 0;
}

.body {
	min-width: 0;
	// Fixed footprint regardless of content length; longer overviews (e.g. the
	// technical one) scroll within this height.
	max-height: 420px;
	overflow-y: auto;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--md);

	// N8nMarkdown's default theme sizes everything at --font-size--md (16px) via a
	// `* { font-size }` rule, which is oversized for this panel. Scale the rendered
	// markdown down and tighten spacing.
	:global(.n8n-markdown) * {
		font-size: var(--font-size--sm);
		line-height: var(--line-height--md);
	}

	:global(.n8n-markdown) li,
	:global(.n8n-markdown) li * {
		font-size: var(--font-size--xs);
	}

	:global(.n8n-markdown) p,
	:global(.n8n-markdown) ul,
	:global(.n8n-markdown) ol {
		margin-bottom: var(--spacing--2xs);
	}
}

.editArea {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	max-height: 420px;
	overflow-y: auto;
}

.empty {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) 0 var(--spacing--4xs);
}

.generating {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) 0;
}

.skeletonLine {
	height: 10px;
	width: 100%;
	border-radius: var(--radius);
	background: linear-gradient(
		90deg,
		var(--color--foreground--tint-1) 25%,
		var(--color--foreground--tint-2) 50%,
		var(--color--foreground--tint-1) 75%
	);
	background-size: 200% 100%;
	animation: shimmer 1.2s ease-in-out infinite;
}

.skeletonShort {
	width: 60%;
}

@keyframes shimmer {
	from {
		background-position: 200% 0;
	}
	to {
		background-position: -200% 0;
	}
}
</style>
