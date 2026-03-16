<script setup lang="ts">
import { ref, computed, watch, onBeforeMount, onMounted, onBeforeUnmount } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { useRouter } from 'vue-router';
import {
	N8nButton,
	N8nHeading,
	N8nText,
	N8nCallout,
	N8nSelect,
	N8nOption,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { usePushConnection } from '@/app/composables/usePushConnection';
import { useCodeEngineStore } from '@/app/stores/codeEngine.store';
import { analyzeCode, runCode, type StaticGraph } from '@/app/api/codeEngine';
import CodeEngineGraph from '@/app/views/CodeEngineGraph.vue';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { history, defaultKeymap, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
	indentOnInput,
	foldGutter,
	bracketMatching,
	syntaxHighlighting,
	HighlightStyle,
} from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { closeBrackets } from '@codemirror/autocomplete';

const darkHighlightStyle = HighlightStyle.define([
	{ tag: tags.keyword, color: '#c586c0' },
	{ tag: tags.controlKeyword, color: '#c586c0' },
	{ tag: tags.operatorKeyword, color: '#c586c0' },
	{ tag: tags.definitionKeyword, color: '#c586c0' },
	{ tag: tags.typeName, color: '#4ec9b0' },
	{ tag: tags.className, color: '#4ec9b0' },
	{ tag: tags.propertyName, color: '#9cdcfe' },
	{ tag: tags.function(tags.variableName), color: '#dcdcaa' },
	{ tag: tags.function(tags.propertyName), color: '#dcdcaa' },
	{ tag: tags.definition(tags.variableName), color: '#9cdcfe' },
	{ tag: tags.variableName, color: '#9cdcfe' },
	{ tag: tags.string, color: '#ce9178' },
	{ tag: tags.number, color: '#b5cea8' },
	{ tag: tags.bool, color: '#569cd6' },
	{ tag: tags.comment, color: '#6a9955', fontStyle: 'italic' },
	{ tag: tags.lineComment, color: '#6a9955', fontStyle: 'italic' },
	{ tag: tags.blockComment, color: '#6a9955', fontStyle: 'italic' },
	{ tag: tags.operator, color: '#d4d4d4' },
	{ tag: tags.punctuation, color: '#d4d4d4' },
	{ tag: tags.bracket, color: '#d4d4d4' },
	{ tag: tags.meta, color: '#d4d4d4' },
	{ tag: tags.atom, color: '#569cd6' },
	{ tag: tags.self, color: '#569cd6' },
	{ tag: tags.null, color: '#569cd6' },
]);

const i18n = useI18n();
const router = useRouter();
const rootStore = useRootStore();
const pushConnectionStore = usePushConnectionStore();
const pushConnection = usePushConnection({ router });
const codeEngineStore = useCodeEngineStore();

interface Example {
	label: string;
	code: string;
	testPayload: string;
}

const EXAMPLES: Example[] = [
	{
		label: i18n.baseText('codeEngine.examples.postOrders'),
		code: `@Controller('/api')
class OrderAutomation {
  @POST('/orders')
  async handleOrder(req: Request) {
    return this.route(req.body);
  }

  @Callable('Route by type')
  route(data: { type: string }) {
    if (data.type === 'order') {
      return this.processOrder(data);
    }
    return this.handleInquiry(data);
  }

  @Callable('Process order')
  processOrder(data: unknown) {
    return { status: 'processed', id: Date.now() };
  }

  @Callable('Handle inquiry')
  handleInquiry(data: unknown) {
    return { status: 'received', message: 'We will get back to you' };
  }
}`,
		testPayload: JSON.stringify({ type: 'order' }, null, 2),
	},
	{
		label: i18n.baseText('codeEngine.examples.getProducts'),
		code: `@Controller('/api')
class ProductCatalog {
  @GET('/products')
  async getProducts(req: Request) {
    return this.filterByCategory(req.query.category);
  }

  @Callable('Filter by category')
  filterByCategory(category: string) {
    switch (category) {
      case 'electronics':
        return this.getElectronics();
      case 'books':
        return this.getBooks();
      default:
        return this.getAllProducts();
    }
  }

  @Callable('Get electronics')
  getElectronics() {
    return { products: [{ name: 'Laptop', price: 999 }, { name: 'Phone', price: 699 }] };
  }

  @Callable('Get books')
  getBooks() {
    return { products: [{ name: 'TypeScript Handbook', price: 39 }, { name: 'Node.js Guide', price: 29 }] };
  }

  @Callable('Get all products')
  getAllProducts() {
    return { products: [{ name: 'Laptop', price: 999 }, { name: 'Phone', price: 699 }, { name: 'TypeScript Handbook', price: 39 }] };
  }
}`,
		testPayload: '',
	},
];

const selectedExampleIndex = ref(0);
const code = ref(EXAMPLES[0].code);
const staticGraph = ref<StaticGraph | null>(null);
const testWebhookUrl = ref<string | null>(null);
const testPayload = ref(EXAMPLES[0].testPayload);
const isAnalyzing = ref(false);
const isRunning = ref(false);
const isSendingTest = ref(false);
const errorMessage = ref<string | null>(null);
const testRequestError = ref<string | null>(null);
const testRequestSuccess = ref<string | null>(null);

const selectedTraceNode = ref<string | null>(null);

const editorRef = ref<HTMLElement>();
const editorView = ref<EditorView>();

const editorExtensions: Extension[] = [
	javascript({ typescript: true }),
	syntaxHighlighting(darkHighlightStyle),
	EditorView.theme({
		'&': { color: '#d4d4d4' },
		'.cm-cursor': { borderLeftColor: '#d4d4d4' },
		'.cm-activeLine': { backgroundColor: '#ffffff0a' },
		'.cm-activeLineGutter': { backgroundColor: '#ffffff0a' },
		'.cm-gutters': { color: '#858585' },
		'.cm-matchingBracket': { backgroundColor: '#ffffff20', outline: '1px solid #888' },
		'.cm-selectionBackground': { backgroundColor: '#264f78 !important' },
		'.cm-foldGutter .cm-gutterElement': { color: '#858585' },
	}),
	lineNumbers(),
	highlightActiveLine(),
	history(),
	indentOnInput(),
	bracketMatching(),
	closeBrackets(),
	foldGutter(),
	keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
	EditorView.lineWrapping,
	EditorView.updateListener.of((update) => {
		if (update.docChanged) {
			code.value = update.state.doc.toString();
		}
	}),
];

const triggerNode = computed(() => {
	return staticGraph.value?.nodes.find((n) => n.type === 'trigger') ?? null;
});

const fullWebhookUrl = computed(() => {
	if (!testWebhookUrl.value) return null;
	const path = testWebhookUrl.value.replace(/^\/webhook-test\//, '');
	return `${rootStore.webhookTestUrl}/${path}`;
});

const triggerHttpMethod = computed(() => {
	return triggerNode.value?.method ?? 'POST';
});

const isGetRequest = computed(() => triggerHttpMethod.value === 'GET');

const selectedNodeData = computed(() => {
	if (!selectedTraceNode.value || !codeEngineStore.executionTrace) return null;
	return codeEngineStore.executionTrace.nodes.find((n) => n.id === selectedTraceNode.value);
});

function handleExampleChange(index: number) {
	selectedExampleIndex.value = index;
	const example = EXAMPLES[index];
	code.value = example.code;
	testPayload.value = example.testPayload;
	staticGraph.value = null;
	testWebhookUrl.value = null;
	errorMessage.value = null;
	testRequestError.value = null;
	testRequestSuccess.value = null;
	codeEngineStore.reset();
	selectedTraceNode.value = null;

	if (editorView.value) {
		editorView.value.dispatch({
			changes: {
				from: 0,
				to: editorView.value.state.doc.length,
				insert: example.code,
			},
		});
	}
}

async function handleAnalyze() {
	isAnalyzing.value = true;
	errorMessage.value = null;
	try {
		staticGraph.value = await analyzeCode(rootStore.restApiContext, code.value);
	} catch (err) {
		errorMessage.value = err instanceof Error ? err.message : String(err);
	} finally {
		isAnalyzing.value = false;
	}
}

async function handleRun() {
	isRunning.value = true;
	errorMessage.value = null;
	codeEngineStore.reset();

	try {
		const response = await runCode(rootStore.restApiContext, code.value, rootStore.pushRef);
		staticGraph.value = response.staticGraph;
		testWebhookUrl.value = response.testWebhookUrl;
		codeEngineStore.setWaitingForWebhook(true);
	} catch (err) {
		errorMessage.value = err instanceof Error ? err.message : String(err);
	} finally {
		isRunning.value = false;
	}
}

async function handleSendTestRequest() {
	if (!fullWebhookUrl.value) return;
	isSendingTest.value = true;
	testRequestError.value = null;
	testRequestSuccess.value = null;

	const method = triggerHttpMethod.value;

	try {
		let url = fullWebhookUrl.value;
		const fetchOptions: RequestInit = { method };

		if (method === 'GET') {
			if (testPayload.value.trim()) {
				const separator = url.includes('?') ? '&' : '?';
				url = `${url}${separator}${testPayload.value.trim()}`;
			}
		} else {
			let body: unknown;
			try {
				body = JSON.parse(testPayload.value);
			} catch {
				testRequestError.value = 'Invalid JSON in request body';
				return;
			}
			fetchOptions.headers = { 'Content-Type': 'application/json' };
			fetchOptions.body = JSON.stringify(body);
		}

		const response = await fetch(url, fetchOptions);
		const text = await response.text();

		if (response.ok) {
			testRequestSuccess.value = `${response.status} ${response.statusText}\n${text}`;
		} else {
			testRequestError.value = `${response.status} ${response.statusText}${text ? `\n${text}` : ''}`;
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		testRequestError.value = `Network error: ${message}\n\nURL: ${fullWebhookUrl.value}\nMethod: ${method}`;
	} finally {
		isSendingTest.value = false;
	}
}

const debouncedAnalyze = useDebounceFn(() => {
	if (code.value.trim()) {
		void handleAnalyze();
	} else {
		staticGraph.value = null;
	}
}, 500);

watch(code, () => {
	void debouncedAnalyze();
});

onBeforeMount(() => {
	pushConnection.initialize();
	pushConnectionStore.pushConnect();
});

onMounted(() => {
	if (editorRef.value) {
		const state = EditorState.create({
			doc: code.value,
			extensions: editorExtensions,
		});
		editorView.value = new EditorView({
			state,
			parent: editorRef.value,
		});
	}

	if (code.value.trim()) {
		void handleAnalyze();
	}
});

onBeforeUnmount(() => {
	editorView.value?.destroy();
	pushConnection.terminate();
	pushConnectionStore.pushDisconnect();
});
</script>

<template>
	<div :class="$style.container">
		<N8nCallout v-if="errorMessage" theme="danger" :class="$style.error">
			{{ errorMessage }}
		</N8nCallout>

		<div :class="$style.content">
			<div :class="$style.editorPanel">
				<div :class="$style.editorToolbar">
					<N8nSelect
						:model-value="selectedExampleIndex"
						size="small"
						:placeholder="i18n.baseText('codeEngine.examples.placeholder')"
						@update:model-value="handleExampleChange"
					>
						<N8nOption
							v-for="(example, index) in EXAMPLES"
							:key="index"
							:value="index"
							:label="example.label"
						/>
					</N8nSelect>
					<N8nButton
						:label="i18n.baseText('codeEngine.run')"
						:loading="isRunning"
						size="small"
						@click="handleRun"
					/>
				</div>
				<div
					v-if="codeEngineStore.waitingForWebhook && fullWebhookUrl"
					:class="$style.testRequestPanel"
				>
					<div :class="$style.webhookInfo">
						<div :class="$style.webhookMethod">{{ triggerHttpMethod }}</div>
						<code :class="$style.webhookUrl">{{ fullWebhookUrl }}</code>
					</div>
					<template v-if="!isGetRequest">
						<N8nText :bold="true" size="small">Body</N8nText>
						<textarea v-model="testPayload" :class="$style.testPayloadInput" spellcheck="false" />
					</template>
					<template v-else>
						<N8nText :bold="true" size="small">Query params</N8nText>
						<input
							v-model="testPayload"
							:class="$style.queryParamsInput"
							placeholder="category=electronics"
							spellcheck="false"
						/>
					</template>
					<N8nButton
						label="Send"
						size="small"
						:loading="isSendingTest"
						@click="handleSendTestRequest"
					/>
					<pre v-if="testRequestSuccess" :class="$style.testRequestSuccess">{{
						testRequestSuccess
					}}</pre>
					<pre v-if="testRequestError" :class="$style.testRequestError">{{ testRequestError }}</pre>
				</div>
				<div ref="editorRef" :class="$style.editor" />
			</div>

			<div :class="$style.graphPanel">
				<template v-if="codeEngineStore.webhookTimedOut">
					<N8nCallout theme="warning" :class="$style.webhookCallout">
						{{ i18n.baseText('codeEngine.webhookTimedOut') }}
					</N8nCallout>
				</template>

				<CodeEngineGraph
					v-if="staticGraph"
					:graph="staticGraph"
					:executing-nodes="codeEngineStore.executingNodes"
					:execution-trace="codeEngineStore.executionTrace"
					:waiting-for-webhook="codeEngineStore.waitingForWebhook"
				/>
			</div>
		</div>

		<div v-if="codeEngineStore.executionTrace" :class="$style.tracePanel">
			<N8nHeading size="small">{{ i18n.baseText('codeEngine.executionTrace') }}</N8nHeading>
			<div :class="$style.traceNodes">
				<div
					v-for="node in codeEngineStore.executionTrace.nodes"
					:key="node.id"
					:class="[
						$style.traceNode,
						selectedTraceNode === node.id && $style.traceNodeSelected,
						node.error && $style.traceNodeError,
					]"
					@click="selectedTraceNode = node.id"
				>
					<N8nText :bold="true">{{ node.label }}</N8nText>
					<N8nText size="small" color="text-light">
						{{ node.completedAt - node.startedAt }}ms
					</N8nText>
				</div>
			</div>
			<div v-if="selectedNodeData" :class="$style.traceDetail">
				<div>
					<N8nText :bold="true">Input:</N8nText>
					<pre :class="$style.jsonBlock">{{ JSON.stringify(selectedNodeData.input, null, 2) }}</pre>
				</div>
				<div>
					<N8nText :bold="true">Output:</N8nText>
					<pre :class="$style.jsonBlock">{{
						JSON.stringify(selectedNodeData.output, null, 2)
					}}</pre>
				</div>
				<div v-if="selectedNodeData.error">
					<N8nText :bold="true" color="danger">Error:</N8nText>
					<pre :class="$style.jsonBlock">{{ selectedNodeData.error }}</pre>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	position: fixed;
	inset: 0;
	z-index: 100;
	padding: var(--spacing--sm);
	gap: var(--spacing--sm);
	background: var(--color--background);
}

.error {
	margin-bottom: var(--spacing--xs);
}

.editorToolbar {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.editorPanel {
	display: flex;
	flex-direction: column;
	flex: 0 0 400px;
	min-height: 0;
	gap: var(--spacing--2xs);
}

.content {
	display: flex;
	flex: 1;
	gap: var(--spacing--sm);
	min-height: 0;
}

.editor {
	flex: 1;
	min-height: 0;
	border: var(--border);
	border-radius: var(--radius--lg);
	overflow: hidden;

	:global(.cm-editor) {
		height: 100%;
		background: #1e1e1e;
	}

	:global(.cm-scroller) {
		overflow: auto;
	}

	:global(.cm-gutters) {
		background: #1e1e1e;
		border-right: none;
	}
}

.graphPanel {
	flex: 1;
	min-width: 0;
	min-height: 0;
	border: var(--border);
	border-radius: var(--radius--lg);
	overflow: hidden;
	position: relative;
}

.testRequestPanel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--color--background);
}

.webhookInfo {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.webhookMethod {
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background: var(--color--success);
	color: white;
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
}

.webhookUrl {
	font-size: var(--font-size--xs);
	word-break: break-all;
}

.testPayloadInput {
	width: 100%;
	min-height: 120px;
	padding: var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	background: #1e1e1e;
	color: #d4d4d4;
	font-family: monospace;
	font-size: var(--font-size--2xs);
	resize: vertical;
}

.queryParamsInput {
	width: 100%;
	padding: var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	background: #1e1e1e;
	color: #d4d4d4;
	font-family: monospace;
	font-size: var(--font-size--2xs);
}

.testRequestSuccess {
	margin: 0;
	padding: var(--spacing--2xs);
	background: var(--color--success--tint-3, #1c3a1c);
	color: var(--color--success, #67c23a);
	border: 1px solid var(--color--success);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-family: monospace;
	white-space: pre-wrap;
	word-break: break-all;
}

.testRequestError {
	margin: 0;
	padding: var(--spacing--2xs);
	background: var(--color--danger--tint-3, #3a1c1c);
	color: var(--color--danger, #ff4949);
	border: 1px solid var(--color--danger);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-family: monospace;
	white-space: pre-wrap;
	word-break: break-all;
}

.webhookCallout {
	margin: var(--spacing--sm);
}

.tracePanel {
	border: var(--border);
	border-radius: var(--radius--lg);
	padding: var(--spacing--sm);
	max-height: 250px;
	overflow-y: auto;
}

.traceNodes {
	display: flex;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
	flex-wrap: wrap;
}

.traceNode {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
	cursor: pointer;

	&:hover {
		background: var(--color--background--shade-1);
	}
}

.traceNodeSelected {
	border-color: var(--color--primary);
	background: var(--color--primary--tint-3);
}

.traceNodeError {
	border-color: var(--color--danger);
}

.traceDetail {
	margin-top: var(--spacing--xs);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.jsonBlock {
	margin-top: var(--spacing--4xs);
	padding: var(--spacing--2xs);
	background: var(--color--background--shade-1);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	overflow-x: auto;
	max-height: 120px;
}
</style>
