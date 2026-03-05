<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
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
import { N8nOption, N8nSelect } from '@n8n/design-system';
import { codeEditorTheme } from '@/features/shared/editors/components/CodeNodeEditor/theme';
import { editorKeymap } from '@/features/shared/editors/plugins/codemirror/keymap';

interface CompilerError {
	message: string;
	line?: number;
	column?: number;
}

interface WorkflowNode {
	id: string;
	name: string;
	type: string;
	typeVersion: number;
	position: [number, number];
	parameters: Record<string, unknown>;
}

interface WorkflowJSON {
	id: string;
	name: string;
	nodes: WorkflowNode[];
	connections: Record<string, unknown>;
}

interface CompilerResult {
	workflow: WorkflowJSON;
	errors: CompilerError[];
}

interface CompilerExample {
	label: string;
	code: string;
}

const EXAMPLES = ref<CompilerExample[]>([]);
const examplesLoading = ref(true);
const selectedExample = ref('');
const code = ref('');
const compilerResult = ref<CompilerResult | null>(null);
const activeTab = ref<'json' | 'errors'>('json');
const bottomPanelOpen = ref(false);
const iframeRef = ref<HTMLIFrameElement | null>(null);
const editorRef = ref<HTMLDivElement>();
const editor = ref<EditorView | null>(null);
const iframeReady = ref(false);
const pendingWorkflow = ref<WorkflowJSON | null>(null);
const executing = ref(false);
const executionLink = ref<{ workflowId: string; executionId: string } | null>(null);

function onSelectExample(label: string) {
	const example = EXAMPLES.value.find((ex) => ex.label === label);
	if (!example) return;
	selectedExample.value = label;
	code.value = example.code;
	if (editor.value) {
		editor.value.dispatch({
			changes: { from: 0, to: editor.value.state.doc.length, insert: example.code },
		});
	}
	void compile();
}

// Compile on code change (debounced)
const debouncedCompile = useDebounceFn(() => {
	void compile();
}, 500);

async function executeWorkflow() {
	if (!compilerResult.value?.workflow || errorCount.value > 0) return;
	executing.value = true;
	executionLink.value = null;
	try {
		const response = await fetch(`${window.BASE_PATH ?? '/'}rest/temporary/execute-workflow`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ workflow: compilerResult.value.workflow }),
		});
		const result = (await response.json()) as {
			data: { workflowId: string; executionId: string; success: boolean };
		};
		executionLink.value = result.data;
	} catch {
		// Network error
	} finally {
		executing.value = false;
	}
}

async function compile() {
	executionLink.value = null;
	try {
		const response = await fetch(`${window.BASE_PATH ?? '/'}rest/temporary/parse-code`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ code: code.value }),
		});
		const result = (await response.json()) as { data: CompilerResult };
		compilerResult.value = result.data;

		if (result.data.errors.length === 0) {
			sendToPreview(result.data.workflow);
		}
	} catch {
		// Network error — show as compiler error
		compilerResult.value = {
			workflow: { id: 'compiled', name: 'Error', nodes: [], connections: {} },
			errors: [{ message: 'Failed to reach compiler API' }],
		};
	}
}

async function fetchExamples() {
	try {
		const response = await fetch(`${window.BASE_PATH ?? '/'}rest/temporary/examples`, {
			credentials: 'include',
		});
		const result = (await response.json()) as { data: CompilerExample[] };
		EXAMPLES.value = result.data;
		if (result.data.length > 0) {
			selectedExample.value = result.data[0].label;
			code.value = result.data[0].code;
		}
	} catch {
		// Fallback: empty examples
		EXAMPLES.value = [];
	} finally {
		examplesLoading.value = false;
	}
}

function sendToPreview(workflow: WorkflowJSON) {
	if (!iframeReady.value) {
		pendingWorkflow.value = workflow;
		return;
	}
	iframeRef.value?.contentWindow?.postMessage(
		JSON.stringify({
			command: 'openWorkflow',
			workflow,
		}),
		'*',
	);
}

// Listen for iframe ready — only accept messages from the iframe,
// not from the outer DemoLayout (which also sends n8nReady to window.parent === window)
function onMessage(event: MessageEvent) {
	if (event.source !== iframeRef.value?.contentWindow) return;
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
		} else if (data.command === 'error') {
			console.error('[CompilerPlayground] iframe error:', data.message);
		}
	} catch {
		// ignore
	}
}

const iframeSrc = computed(() => {
	return `${window.BASE_PATH ?? '/'}workflows/demo?interactive=true`;
});

const jsonOutput = computed(() => {
	if (!compilerResult.value) return '';
	return JSON.stringify(compilerResult.value.workflow, null, 2);
});

const errorCount = computed(() => compilerResult.value?.errors.length ?? 0);
const nodeCount = computed(() => {
	if (!compilerResult.value?.workflow) return 0;
	return compilerResult.value.workflow.nodes.filter((n) => n.type !== 'n8n-nodes-base.stickyNote')
		.length;
});
const stickyCount = computed(() => {
	if (!compilerResult.value?.workflow) return 0;
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
		void debouncedCompile();
	}),
]);

onMounted(async () => {
	window.addEventListener('message', onMessage);

	// Fetch examples from API
	await fetchExamples();

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
	await compile();
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
			<N8nSelect
				size="small"
				:model-value="selectedExample"
				:class="$style.exampleSelect"
				@update:model-value="onSelectExample"
			>
				<N8nOption v-for="ex in EXAMPLES" :key="ex.label" :value="ex.label" :label="ex.label" />
			</N8nSelect>
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
				<button
					:class="$style.runBtn"
					:disabled="executing || errorCount > 0"
					@click="executeWorkflow"
				>
					{{ executing ? 'Running...' : 'Run' }}
				</button>
				<a
					v-if="executionLink"
					:class="$style.executionLink"
					:href="`/workflow/${executionLink.workflowId}/executions/${executionLink.executionId}`"
					target="_blank"
				>
					View Execution
				</a>
			</div>
		</div>

		<!-- Main content -->
		<div :class="$style.main">
			<!-- Left pane: Code editor -->
			<div :class="$style.editorPane">
				<div ref="editorRef" :class="$style.editorContainer" />
			</div>

			<!-- Right pane: Interactive canvas + bottom panel -->
			<div :class="$style.rightPane">
				<!-- Canvas -->
				<div :class="$style.canvasContainer">
					<iframe ref="iframeRef" :class="$style.iframe" :src="iframeSrc" />
				</div>

				<!-- Bottom panel (JSON / Errors) -->
				<div v-if="bottomPanelOpen" :class="$style.bottomPanel">
					<div :class="$style.tabs">
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
						<button :class="$style.tabClose" @click="bottomPanelOpen = false">&times;</button>
					</div>
					<div :class="$style.bottomPanelContent">
						<pre v-show="activeTab === 'json'" :class="$style.jsonOutput">{{ jsonOutput }}</pre>
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

				<!-- Toggle bar when panel is closed -->
				<div v-else :class="$style.bottomToggle">
					<button
						:class="[$style.toggleBtn, errorCount > 0 && $style.errorTab]"
						@click="bottomPanelOpen = true"
					>
						{{ errorCount > 0 ? `Errors (${errorCount})` : 'JSON / Errors' }}
					</button>
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
	width: 100%;
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

.exampleSelect {
	width: 200px;
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

.runBtn {
	padding: var(--spacing--4xs) var(--spacing--xs);
	border: none;
	border-radius: var(--radius);
	background: var(--color--primary);
	color: #fff;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	cursor: pointer;

	&:hover:not(:disabled) {
		background: var(--color--primary--shade-1);
	}

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
}

.executionLink {
	font-size: var(--font-size--2xs);
	color: var(--color--primary);
	text-decoration: none;

	&:hover {
		text-decoration: underline;
	}
}

.main {
	display: grid;
	grid-template-columns: 1fr 1fr;
	flex: 1;
	overflow: hidden;
}

.editorPane {
	display: flex;
	flex-direction: column;
	border-right: var(--border);
	overflow: hidden;
	min-width: 0;
}

.editorContainer {
	flex: 1;
	overflow: hidden;

	& > div {
		height: 100%;
	}
}

.rightPane {
	display: flex;
	flex-direction: column;
	overflow: hidden;
	min-width: 0;
}

.canvasContainer {
	flex: 1;
	position: relative;
	overflow: hidden;
}

.iframe {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	border: none;
}

.bottomToggle {
	border-top: var(--border);
	padding: var(--spacing--4xs) var(--spacing--sm);
	background: var(--color--background);
}

.toggleBtn {
	border: none;
	background: none;
	cursor: pointer;
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	padding: var(--spacing--4xs) var(--spacing--2xs);

	&:hover {
		color: var(--color--text);
	}
}

.bottomPanel {
	height: 200px;
	display: flex;
	flex-direction: column;
	border-top: var(--border);
}

.tabs {
	display: flex;
	background: var(--color--background);
	border-bottom: var(--border);
}

.tab {
	padding: var(--spacing--4xs) var(--spacing--sm);
	border: none;
	background: none;
	cursor: pointer;
	font-size: var(--font-size--2xs);
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

.tabClose {
	margin-left: auto;
	border: none;
	background: none;
	cursor: pointer;
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-2);
	padding: var(--spacing--4xs) var(--spacing--2xs);

	&:hover {
		color: var(--color--text);
	}
}

.bottomPanelContent {
	flex: 1;
	overflow: hidden;
	position: relative;
}

.jsonOutput {
	position: absolute;
	inset: 0;
	padding: var(--spacing--sm);
	margin: 0;
	overflow: auto;
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	background: var(--color--background);
	white-space: pre-wrap;
	word-wrap: break-word;
}

.errorList {
	position: absolute;
	inset: 0;
	padding: var(--spacing--sm);
	overflow: auto;
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
