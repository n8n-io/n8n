<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { defaultKeymap, history } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import { javascript } from '@codemirror/lang-javascript';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers, keymap } from '@codemirror/view';
import { N8nIcon, N8nText } from '@n8n/design-system';

import { codeEditorTheme } from '@/features/shared/editors/components/CodeNodeEditor/theme';
import type { AgentJsonConfig } from '../types';
import type { CustomToolEntry } from '../agent.types';

const props = defineProps<{
	config: AgentJsonConfig | null;
	agentTools: Record<string, CustomToolEntry>;
}>();

const emit = defineEmits<{
	'update:config': [config: AgentJsonConfig];
}>();

// ---------------------------------------------------------------------------
// JSON config editor
// ---------------------------------------------------------------------------

const jsonContainer = ref<HTMLDivElement>();
let jsonView: EditorView | null = null;
let isProgrammaticJsonUpdate = false;
const jsonError = ref('');

function configToJson(config: AgentJsonConfig | null): string {
	return config ? JSON.stringify(config, null, 2) : '';
}

const debouncedJsonSave = useDebounceFn((text: string) => {
	try {
		const parsed = JSON.parse(text) as AgentJsonConfig;
		jsonError.value = '';
		emit('update:config', parsed);
	} catch {
		jsonError.value = 'Invalid JSON';
	}
}, 800);

function createJsonEditor(doc: string) {
	if (!jsonContainer.value) return;

	jsonView = new EditorView({
		state: EditorState.create({
			doc,
			extensions: [
				json(),
				lineNumbers(),
				EditorView.lineWrapping,
				history(),
				keymap.of(defaultKeymap),
				codeEditorTheme({ isReadOnly: false, maxHeight: '100%', minHeight: '100%', rows: -1 }),
				EditorView.updateListener.of((update) => {
					if (!update.docChanged || isProgrammaticJsonUpdate) return;
					const text = update.state.doc.toString();
					void debouncedJsonSave(text);
				}),
			],
		}),
		parent: jsonContainer.value,
	});
}

// Keep the editor in sync with external config changes (e.g., builder updates)
watch(
	() => props.config,
	(newConfig) => {
		if (!jsonView) return;
		const newText = configToJson(newConfig);
		const current = jsonView.state.doc.toString();
		if (current !== newText && !jsonView.hasFocus) {
			isProgrammaticJsonUpdate = true;
			jsonView.dispatch({ changes: { from: 0, to: current.length, insert: newText } });
			isProgrammaticJsonUpdate = false;
			jsonError.value = '';
		}
	},
	{ deep: true },
);

// ---------------------------------------------------------------------------
// Custom tool editors (readonly)
// ---------------------------------------------------------------------------

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
	if (expandedTools.value[id]) {
		// Editor mounts after toggle — use nextTick via watch
	}
}

// Create editors when a tool is expanded
watch(
	expandedTools,
	(state) => {
		for (const [id, expanded] of Object.entries(state)) {
			if (expanded && !toolViews.has(id)) {
				const code = props.agentTools[id]?.code ?? '';
				const el = toolContainers.value[id];
				if (el) {
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
		}
	},
	{ deep: true },
);

// Sync tool code when agentTools prop changes
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

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

onMounted(() => {
	createJsonEditor(configToJson(props.config));
});

onBeforeUnmount(() => {
	jsonView?.destroy();
	jsonView = null;
	for (const view of toolViews.values()) {
		view.destroy();
	}
	toolViews.clear();
});
</script>

<template>
	<div :class="$style.root">
		<!-- JSON Config section -->
		<div :class="$style.section">
			<div :class="$style.sectionHeader">
				<N8nIcon icon="file-code" :size="14" />
				<N8nText size="small" bold>config.json</N8nText>
				<span :class="$style.badge">JSON</span>
				<span v-if="jsonError" :class="$style.errorBadge">{{ jsonError }}</span>
			</div>
			<div ref="jsonContainer" :class="$style.editorArea" />
		</div>

		<!-- Custom Tools section -->
		<div v-if="toolEntries.length > 0" :class="$style.section">
			<div :class="$style.sectionHeader">
				<N8nIcon icon="wrench" :size="14" />
				<N8nText size="small" bold>Custom Tools</N8nText>
				<span :class="$style.badge">{{ toolEntries.length }}</span>
			</div>

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
	</div>
</template>

<style module>
.root {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-height: 0;
	overflow-y: auto;
	background-color: var(--color--foreground--tint-2);
}

.section {
	display: flex;
	flex-direction: column;
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
}

/* Config section takes all remaining space before tools */
.section:first-child {
	flex: 1;
	min-height: 0;
}

.sectionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
	background-color: var(--color--foreground--tint-2);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
	flex-shrink: 0;
}

.badge {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-2);
	background-color: var(--color--foreground--tint-1);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius--sm);
}

.errorBadge {
	font-size: var(--font-size--3xs);
	color: var(--color--danger);
	background-color: var(--color--danger--tint-2);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius--sm);
	margin-left: auto;
}

.editorArea {
	flex: 1;
	min-height: 0;
	overflow: hidden;
}

.editorArea > div,
.editorArea :global(.cm-editor) {
	height: 100%;
}

.editorArea :global(.cm-scroller) {
	overflow: auto;
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
