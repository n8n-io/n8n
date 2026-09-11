<script setup lang="ts">
import EditorJS, { type ToolboxConfigEntry } from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Delimiter from '@editorjs/delimiter';
import type { AppContent, AppLayout } from '@n8n/api-types';
import { useDebounceFn } from '@vueuse/core';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { computed, onBeforeUnmount, onMounted, ref, useCssModule, watch } from 'vue';

import { DEBOUNCE_TIME } from '@/app/constants';
import { AgentChatBlockTool } from '@/features/apps/components/blocks/AgentChatBlockTool.tool';
import { TableBlockTool } from '@/features/apps/components/blocks/TableBlockTool.tool';
import { FormBlockTool } from '@/features/apps/components/blocks/FormBlockTool.tool';
import { ButtonBlockTool } from '@/features/apps/components/blocks/ButtonBlockTool.tool';
import { HtmlBlockTool } from '@/features/apps/components/blocks/HtmlBlockTool.tool';
import { CodeBlockTool } from '@/features/apps/components/blocks/CodeBlockTool.tool';
import { ImageBlockTool } from '@/features/apps/components/blocks/ImageBlockTool.tool';
import { ParagraphTool } from '@/features/apps/components/blocks/ParagraphTool.tool';
import { SlotBlockTool } from '@/features/apps/components/blocks/SlotBlockTool.tool';
import {
	toEditorBlocks,
	validateEditorBlocks,
	type EditorSchema,
} from '@/features/apps/components/pageContentEditor.utils';

const props = withDefaults(
	defineProps<{
		content: AppLayout;
		projectId: string;
		/** `layout` adds the slot tool and validates against `appLayoutSchema`. */
		schema?: EditorSchema;
		/** Problems found outside the editor (e.g. render errors), highlighted by block id. */
		externalIssues?: Record<string, string>;
	}>(),
	{ schema: 'content', externalIssues: () => ({}) },
);

const emit = defineEmits<{
	'update:content': [content: AppContent];
	'update:layout': [layout: AppLayout];
}>();

const style = useCssModule();
const settingsStore = useSettingsStore();
const holderRef = ref<HTMLDivElement>();
const issues = ref<Record<string, string>>({});
const highlighted = computed(() => ({ ...issues.value, ...props.externalIssues }));
let editor: EditorJS | null = null;

function applyIssueHighlights() {
	if (!editor) return;
	for (let i = 0; i < editor.blocks.getBlocksCount(); i++) {
		const block = editor.blocks.getBlockByIndex(i);
		if (!block) continue;
		block.holder.classList.toggle(style.blockError, Boolean(highlighted.value[block.id]));
	}
}

async function handleChange() {
	if (!editor) return;
	const output = await editor.save();
	const { content, layout, issues: nextIssues } = validateEditorBlocks(output.blocks, props.schema);

	issues.value = nextIssues;
	applyIssueHighlights();
	if (content) emit('update:content', content);
	if (layout) emit('update:layout', layout);
}

watch(() => props.externalIssues, applyIssueHighlights);

const debouncedHandleChange = useDebounceFn(
	handleChange,
	getDebounceTime(DEBOUNCE_TIME.INPUT.TEXT_CHANGE),
);

// The stored list is flat (`items: string[]`), so nesting is off and the
// checklist style, which the schema has no place for, is left out of the toolbox.
const listToolbox = [List.toolbox]
	.flat()
	.filter((entry: ToolboxConfigEntry) => entry.data?.style !== 'checklist');

onMounted(() => {
	editor = new EditorJS({
		holder: holderRef.value,
		autofocus: false,
		tools: {
			header: { class: Header, inlineToolbar: true },
			paragraph: { class: ParagraphTool, inlineToolbar: true },
			list: {
				class: List,
				inlineToolbar: true,
				toolbox: listToolbox,
				config: { defaultStyle: 'unordered', maxLevel: 1 },
			},
			image: ImageBlockTool,
			delimiter: Delimiter,
			table: { class: TableBlockTool, config: { projectId: props.projectId } },
			form: { class: FormBlockTool, config: { projectId: props.projectId } },
			button: { class: ButtonBlockTool, config: { projectId: props.projectId } },
			html: HtmlBlockTool,
			code: CodeBlockTool,
			// Always registered so an existing block still renders and saves; only
			// the toolbox entry follows the agents module.
			'agent-chat': {
				class: AgentChatBlockTool,
				config: { projectId: props.projectId },
				...(settingsStore.isModuleActive('agents') ? {} : { toolbox: false }),
			},
			...(props.schema === 'layout' ? { slot: SlotBlockTool } : {}),
		},
		data: { blocks: toEditorBlocks(props.content) },
		onReady: applyIssueHighlights,
		onChange: () => {
			void debouncedHandleChange();
		},
	});
});

onBeforeUnmount(() => {
	void editor?.destroy();
	editor = null;
});
</script>

<template>
	<div :class="$style.container">
		<div ref="holderRef" data-test-id="page-content-editor-holder" />
		<div
			v-for="(message, blockId) in issues"
			:key="blockId"
			:class="$style.issueMessage"
			:data-test-id="`page-content-issue-${blockId}`"
		>
			{{ message }}
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	width: 100%;

	// Editor.js's toolbar has `will-change: opacity`, which makes it a stacking
	// context at z-index auto; its toolbox popover (z-index 4 inside) would then
	// paint under any positioned block content, e.g. a multi-select's tag row.
	:global(.ce-toolbar) {
		z-index: 2;
	}

	// Editor.js caps blocks at 650px and pads the bottom for its toolbox; the
	// main card is the column here.
	:global(.ce-block__content),
	:global(.ce-toolbar__content) {
		max-width: none;
	}

	:global(.codex-editor__redactor) {
		padding-bottom: var(--spacing--xl);
	}

	// Text blocks use the same tokens as the served partials
	// (packages/cli/templates/partials/app-block-*.handlebars).
	:global(.ce-header),
	:global(.ce-paragraph) {
		padding: 0;
		margin-bottom: var(--spacing--md);
	}

	:global(.ce-header) {
		font-weight: var(--font-weight--bold);
		line-height: var(--line-height--sm);
	}

	:global(h1.ce-header) {
		font-size: var(--font-size--2xl);
	}

	:global(h2.ce-header) {
		font-size: var(--font-size--xl);
	}

	:global(h3.ce-header) {
		font-size: var(--font-size--lg);
	}

	:global(h4.ce-header) {
		font-size: var(--font-size--md);
	}

	:global(h5.ce-header) {
		font-size: var(--font-size--sm);
	}

	:global(h6.ce-header) {
		font-size: var(--font-size--xs);
	}

	:global(.cdx-list) {
		padding-left: var(--spacing--lg);
		margin-bottom: var(--spacing--md);
	}
}

.issueMessage {
	color: var(--color--danger);
	font-size: var(--font-size--3xs);
	padding: var(--spacing--3xs) 0;
}

.blockError {
	border: 1px solid var(--color--danger);
	border-radius: var(--radius--sm);
}
</style>
