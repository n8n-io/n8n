<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { history } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { foldGutter, indentOnInput } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { EditorState } from '@codemirror/state';
import type { ViewUpdate } from '@codemirror/view';
import {
	EditorView,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap,
	lineNumbers,
} from '@codemirror/view';
import { codeEditorTheme } from '@/features/shared/editors/components/CodeNodeEditor/theme';
import { editorKeymap } from '@/features/shared/editors/plugins/codemirror/keymap';
import { compileWorkflowJS, type CompilerResult } from './compiler';

const SAMPLE_CODE = `// @trigger manual
// @workflow "My First Workflow"

// Fetch users from the API
const users = await http.get('https://jsonplaceholder.typicode.com/users');

// Extract names and emails
const contacts = users.map(u => ({
  name: u.name,
  email: u.email,
  company: u.company.name,
}));

// Send summary to webhook
await http.post('https://httpbin.org/post', { contacts });
`;

const code = ref(SAMPLE_CODE);
const compilerResult = ref<CompilerResult | null>(null);
const activeTab = ref<'preview' | 'json' | 'errors'>('preview');
const iframeRef = ref<HTMLIFrameElement | null>(null);
const editorRef = ref<HTMLDivElement>();
const editor = ref<EditorView | null>(null);
const iframeReady = ref(false);
const pendingWorkflow = ref<Record<string, unknown> | null>(null);

// Compile on code change (debounced)
const debouncedCompile = useDebounceFn(() => {
	compile();
}, 500);

function compile() {
	const result = compileWorkflowJS(code.value);
	compilerResult.value = result;

	if (result.errors.length === 0) {
		sendToPreview(result.workflow);
	}
}

function sendToPreview(workflow: Record<string, unknown>) {
	if (!iframeReady.value) {
		pendingWorkflow.value = workflow;
		return;
	}
	iframeRef.value?.contentWindow?.postMessage(
		JSON.stringify({
			command: 'openWorkflow',
			workflow,
			canOpenNDV: false,
			hideNodeIssues: true,
		}),
		'*',
	);
}

// Listen for iframe ready
function onMessage(event: MessageEvent) {
	if (!event.data?.includes?.('"command"')) return;
	try {
		const data = JSON.parse(event.data);
		if (data.command === 'n8nReady') {
			iframeReady.value = true;
			// Send pending workflow if any
			if (pendingWorkflow.value) {
				sendToPreview(pendingWorkflow.value);
				pendingWorkflow.value = null;
			}
		}
	} catch {
		// ignore
	}
}

const iframeSrc = computed(() => {
	return `${window.BASE_PATH ?? '/'}workflows/demo?hideControls=true`;
});

const jsonOutput = computed(() => {
	if (!compilerResult.value) return '';
	return JSON.stringify(compilerResult.value.workflow, null, 2);
});

const errorCount = computed(() => compilerResult.value?.errors.length ?? 0);
const nodeCount = computed(() => {
	if (!compilerResult.value) return 0;
	return compilerResult.value.workflow.nodes.filter((n) => n.type !== 'n8n-nodes-base.stickyNote')
		.length;
});
const stickyCount = computed(() => {
	if (!compilerResult.value) return 0;
	return compilerResult.value.workflow.nodes.filter((n) => n.type === 'n8n-nodes-base.stickyNote')
		.length;
});

// CodeMirror setup
const extensions = computed<Extension[]>(() => [
	javascript(),
	lineNumbers(),
	EditorView.lineWrapping,
	history(),
	keymap.of(editorKeymap),
	indentOnInput(),
	highlightActiveLine(),
	highlightActiveLineGutter(),
	foldGutter(),
	codeEditorTheme({
		isReadOnly: false,
		maxHeight: '100%',
		minHeight: '100%',
		rows: -1,
	}),
	EditorView.updateListener.of((viewUpdate: ViewUpdate) => {
		if (!viewUpdate.docChanged || !editor.value) return;
		code.value = editor.value.state.doc.toString();
		debouncedCompile();
	}),
]);

onMounted(() => {
	window.addEventListener('message', onMessage);

	// Create CodeMirror editor
	if (editorRef.value) {
		const state = EditorState.create({
			doc: code.value,
			extensions: extensions.value,
		});
		editor.value = new EditorView({
			parent: editorRef.value,
			state,
		});
	}

	// Initial compile
	compile();
});

onBeforeUnmount(() => {
	window.removeEventListener('message', onMessage);
	editor.value?.destroy();
});
</script>

<template>
	<div :class="$style.container">
		<!-- Header -->
		<div :class="$style.header">
			<h2 :class="$style.title">Workflow JS Compiler</h2>
			<div :class="$style.status">
				<span v-if="errorCount > 0" :class="$style.errorBadge">
					{{ errorCount }} error{{ errorCount !== 1 ? 's' : '' }}
				</span>
				<span v-else :class="$style.successBadge">
					{{ nodeCount }} node{{ nodeCount !== 1 ? 's' : '' }}
					<template v-if="stickyCount > 0">
						+ {{ stickyCount }} sticky note{{ stickyCount !== 1 ? 's' : '' }}
					</template>
				</span>
			</div>
		</div>

		<!-- Main content -->
		<div :class="$style.main">
			<!-- Left pane: Code editor -->
			<div :class="$style.editorPane">
				<div ref="editorRef" :class="$style.editorContainer" />
			</div>

			<!-- Right pane: Preview/JSON/Errors -->
			<div :class="$style.previewPane">
				<!-- Tabs -->
				<div :class="$style.tabs">
					<button
						:class="[$style.tab, activeTab === 'preview' && $style.activeTab]"
						@click="activeTab = 'preview'"
					>
						Preview
					</button>
					<button
						:class="[$style.tab, activeTab === 'json' && $style.activeTab]"
						@click="activeTab = 'json'"
					>
						JSON
					</button>
					<button
						:class="[
							$style.tab,
							activeTab === 'errors' && $style.activeTab,
							errorCount > 0 && $style.errorTab,
						]"
						@click="activeTab = 'errors'"
					>
						Errors {{ errorCount > 0 ? `(${errorCount})` : '' }}
					</button>
				</div>

				<!-- Tab content -->
				<div :class="$style.tabContent">
					<!-- Workflow Preview -->
					<iframe
						v-show="activeTab === 'preview'"
						ref="iframeRef"
						:class="$style.iframe"
						:src="iframeSrc"
					/>

					<!-- JSON output -->
					<pre v-show="activeTab === 'json'" :class="$style.jsonOutput">{{ jsonOutput }}</pre>

					<!-- Errors -->
					<div v-show="activeTab === 'errors'" :class="$style.errorList">
						<div v-if="errorCount === 0" :class="$style.noErrors">No compilation errors</div>
						<div
							v-for="(error, i) in compilerResult?.errors ?? []"
							:key="i"
							:class="$style.errorItem"
						>
							<span v-if="error.line" :class="$style.errorLine">
								Line {{ error.line }}:{{ error.column }}
							</span>
							{{ error.message }}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background: var(--color--background);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-bottom: var(--border);
	background: var(--color--background);
}

.title {
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	margin: 0;
}

.status {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.errorBadge {
	background: var(--color--danger--tint-3);
	color: var(--color--danger);
	padding: var(--spacing--5xs) var(--spacing--2xs);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
}

.successBadge {
	background: var(--color--success--tint-3);
	color: var(--color--success);
	padding: var(--spacing--5xs) var(--spacing--2xs);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
}

.main {
	display: flex;
	flex: 1;
	overflow: hidden;
}

.editorPane {
	flex: 1;
	display: flex;
	flex-direction: column;
	border-right: var(--border);
	overflow: hidden;
}

.editorContainer {
	flex: 1;
	overflow: hidden;

	& > div {
		height: 100%;
	}
}

.previewPane {
	flex: 1;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.tabs {
	display: flex;
	border-bottom: var(--border);
	background: var(--color--background);
}

.tab {
	padding: var(--spacing--2xs) var(--spacing--sm);
	border: none;
	background: none;
	cursor: pointer;
	font-size: var(--font-size--xs);
	color: var(--color--text--tint-1);
	border-bottom: 2px solid transparent;

	&:hover {
		color: var(--color--text);
		background: var(--color--foreground--tint-2);
	}
}

.activeTab {
	color: var(--color--primary);
	border-bottom-color: var(--color--primary);
}

.errorTab {
	color: var(--color--danger);
}

.tabContent {
	flex: 1;
	overflow: hidden;
	position: relative;
}

.iframe {
	width: 100%;
	height: 100%;
	border: none;
}

.jsonOutput {
	padding: var(--spacing--sm);
	margin: 0;
	overflow: auto;
	height: 100%;
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	background: var(--color--background);
	white-space: pre-wrap;
	word-wrap: break-word;
}

.errorList {
	padding: var(--spacing--sm);
	overflow: auto;
	height: 100%;
}

.noErrors {
	color: var(--color--text--tint-2);
	font-size: var(--font-size--sm);
}

.errorItem {
	padding: var(--spacing--2xs);
	margin-bottom: var(--spacing--2xs);
	background: var(--color--danger--tint-4);
	border-radius: var(--radius);
	font-size: var(--font-size--xs);
	color: var(--color--text);
}

.errorLine {
	font-weight: var(--font-weight--bold);
	color: var(--color--danger);
	margin-right: var(--spacing--2xs);
}
</style>
