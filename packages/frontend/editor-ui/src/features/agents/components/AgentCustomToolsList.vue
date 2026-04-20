<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { javascript } from '@codemirror/lang-javascript';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { N8nIcon, N8nText } from '@n8n/design-system';

import { codeEditorTheme } from '@/features/shared/editors/components/CodeNodeEditor/theme';
import type { CustomToolEntry } from '../agent.types';

const props = defineProps<{
	agentTools: Record<string, CustomToolEntry>;
}>();

const toolContainers = ref<Record<string, HTMLDivElement | null>>({});
const toolViews = new Map<string, EditorView>();
const expandedTools = ref<Record<string, boolean>>({});

const toolEntries = computed(() => Object.entries(props.agentTools));

function createToolEditor(id: string, code: string) {
	const el = toolContainers.value[id];
	if (!el || toolViews.has(id)) return;
	const view = new EditorView({
		state: EditorState.create({
			doc: code,
			extensions: [
				javascript({ typescript: true }),
				lineNumbers(),
				EditorView.lineWrapping,
				EditorState.readOnly.of(true),
				EditorView.editable.of(false),
				codeEditorTheme({
					isReadOnly: true,
					maxHeight: '400px',
					minHeight: '80px',
					rows: -1,
				}),
			],
		}),
		parent: el,
	});
	toolViews.set(id, view);
}

function onToolContainerMounted(id: string, el: HTMLDivElement | null) {
	toolContainers.value[id] = el;
	if (el && expandedTools.value[id]) {
		const code = props.agentTools[id]?.code ?? '';
		createToolEditor(id, code);
	}
}

function toggleTool(id: string) {
	expandedTools.value[id] = !expandedTools.value[id];
}

watch(
	expandedTools,
	(state) => {
		for (const [id, expanded] of Object.entries(state)) {
			if (expanded && !toolViews.has(id)) {
				const code = props.agentTools[id]?.code ?? '';
				const el = toolContainers.value[id];
				if (!el) continue;
				const view = new EditorView({
					state: EditorState.create({
						doc: code,
						extensions: [
							javascript({ typescript: true }),
							lineNumbers(),
							EditorView.lineWrapping,
							EditorState.readOnly.of(true),
							EditorView.editable.of(false),
							codeEditorTheme({
								isReadOnly: true,
								maxHeight: '400px',
								minHeight: '80px',
								rows: -1,
							}),
						],
					}),
					parent: el,
				});
				toolViews.set(id, view);
			}
		}
	},
	{ deep: true },
);

watch(
	() => props.agentTools,
	(tools) => {
		for (const [id, entry] of Object.entries(tools)) {
			const view = toolViews.get(id);
			if (!view) continue;
			const current = view.state.doc.toString();
			if (current !== entry.code) {
				view.dispatch({
					changes: { from: 0, to: current.length, insert: entry.code },
				});
			}
		}
	},
	{ deep: true },
);

onBeforeUnmount(() => {
	for (const view of toolViews.values()) {
		view.destroy();
	}
	toolViews.clear();
});
</script>

<template>
	<div :class="$style.root">
		<div v-for="[id, entry] in toolEntries" :key="id" :class="$style.toolBlock">
			<button :class="$style.toolHeader" @click="toggleTool(id)">
				<N8nIcon :icon="expandedTools[id] ? 'chevron-down' : 'chevron-right'" :size="12" />
				<N8nText size="small" bold>{{ entry.descriptor.name }}</N8nText>
				<span :class="$style.toolMeta">{{ entry.descriptor.description }}</span>
			</button>
			<div
				v-show="expandedTools[id]"
				:ref="(el) => onToolContainerMounted(id, el as HTMLDivElement | null)"
				:class="$style.toolEditorArea"
			/>
		</div>
	</div>
</template>

<style module>
.root {
	display: flex;
	flex-direction: column;
}

.toolBlock {
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
}

.toolBlock:last-child {
	border-bottom: none;
}

.toolHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--2xs) var(--spacing--sm);
	background: none;
	border: none;
	cursor: pointer;
	text-align: left;
	color: var(--color--text);
}

.toolHeader:hover {
	background-color: var(--color--foreground--tint-1);
}

.toolMeta {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-2);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	flex: 1;
	margin-left: var(--spacing--4xs);
}

.toolEditorArea {
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
}

.toolEditorArea :global(.cm-editor) {
	max-height: 400px;
}

.toolEditorArea :global(.cm-scroller) {
	overflow: auto;
}
</style>
