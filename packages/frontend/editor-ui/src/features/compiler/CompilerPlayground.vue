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
import { compileWorkflowJS, type CompilerResult, type WorkflowJSON } from './compiler';

const EXAMPLES = [
	{
		label: 'Simple API Call',
		code: `// @workflow "Simple API Call"
trigger.manual()

// Fetch users from the API
const users = await http.get('https://jsonplaceholder.typicode.com/users');

// Extract names and emails
const contacts = users.map(u => ({
  name: u.name,
  email: u.email,
  company: u.company.name,
}));

// Send results
await http.post('https://httpbin.org/post', { contacts });
`,
	},
	{
		label: 'ETL Pipeline',
		code: `// @workflow "ETL Pipeline"
trigger.schedule({ every: '1h' })

// Extract: fetch raw data from multiple sources
const users = await http.get('https://jsonplaceholder.typicode.com/users');
const todos = await http.get('https://jsonplaceholder.typicode.com/todos');

// Transform: enrich users with task completion rates
const enriched = users.map(u => {
  const userTodos = todos.filter(t => t.userId === u.id);
  const completed = userTodos.filter(t => t.completed).length;
  return {
    name: u.name,
    email: u.email,
    city: u.address.city,
    totalTasks: userTodos.length,
    completedTasks: completed,
    completionRate: Math.round((completed / userTodos.length) * 100),
  };
});

// Transform: segment users by performance
const highPerformers = enriched.filter(u => u.completionRate >= 70);
const needsAttention = enriched.filter(u => u.completionRate < 30);

// Load: send enriched data to the data warehouse
await http.post('https://httpbin.org/post', {
  enriched,
  segments: { highPerformers, needsAttention },
  processedAt: new Date().toISOString(),
});
`,
	},
	{
		label: 'AI Content Pipeline',
		code: `// @workflow "AI Content Pipeline"
trigger.manual()

// Fetch trending topics
const posts = await http.get('https://jsonplaceholder.typicode.com/posts');

// Pick the top 5 most discussed topics
const topPosts = posts.slice(0, 5).map(p => p.title);

// Generate a blog draft with AI
const draft = await ai.chat('gpt-4o', 'Write a short blog post covering these topics: ' + topPosts.join(', '));

// Generate social media snippets
const social = await ai.chat('gpt-4o-mini', 'Turn this into 3 tweet-sized summaries: ' + draft);

// Publish the content
await http.post('https://httpbin.org/post', { draft, social });
`,
	},
	{
		label: 'Webhook Processor',
		code: `// @workflow "Webhook Processor"
trigger.webhook({ method: 'POST', path: '/orders' })

// Validate the incoming order
const order = await http.get('https://jsonplaceholder.typicode.com/posts/1');

// Calculate totals
const items = [
  { name: 'Widget A', qty: 3, price: 9.99 },
  { name: 'Widget B', qty: 1, price: 24.50 },
];
const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);
const tax = Math.round(subtotal * 0.08 * 100) / 100;
const total = subtotal + tax;

// Build the invoice
const invoice = {
  orderId: order.id,
  items,
  subtotal,
  tax,
  total,
  currency: 'USD',
};

// Send to payment processor
await http.post('https://httpbin.org/post', { invoice });

// Notify the customer
await http.post('https://httpbin.org/post', {
  to: 'customer@example.com',
  subject: 'Order confirmed',
  body: 'Your order total is $' + total.toFixed(2),
});
`,
	},
	{
		label: 'AI Data Enrichment',
		code: `// @workflow "AI Data Enrichment"
trigger.schedule({ cron: '0 9 * * 1' })

// Fetch this week's support tickets
const tickets = await http.get('https://jsonplaceholder.typicode.com/comments');

// Categorize tickets with AI
const categories = await ai.chat('gpt-4o-mini', 'Classify each ticket into bug/feature/question: ' + JSON.stringify(tickets.slice(0, 10)));

// Summarize the week for leadership
const report = await ai.chat('gpt-4o', 'Write a weekly support summary from these categories: ' + categories);

// Post the report to Slack
await http.post('https://httpbin.org/post', {
  channel: '#support-weekly',
  text: report,
});
`,
	},
	{
		label: 'Multi-Step Integration',
		code: `// @workflow "CRM Sync"
trigger.schedule({ every: '30m' })

// Fetch new leads from the marketing platform
const leads = await http.get('https://jsonplaceholder.typicode.com/users');

// Fetch existing CRM contacts
const existing = await http.get('https://jsonplaceholder.typicode.com/comments');

// Find leads not yet in the CRM
const existingEmails = new Set(existing.map(c => c.email));
const newLeads = leads.filter(l => !existingEmails.has(l.email));

// Score each new lead
const scored = newLeads.map(lead => ({
  name: lead.name,
  email: lead.email,
  company: lead.company.name,
  score: lead.company.bs.split(' ').length * 10,
  source: 'marketing',
}));

// Filter to high-value leads only
const highValue = scored.filter(l => l.score >= 20);

// Push high-value leads to the CRM
await http.post('https://httpbin.org/post', { leads: highValue });

// Notify the sales team
await http.post('https://httpbin.org/post', {
  channel: '#sales',
  text: highValue.length + ' new high-value leads synced to CRM',
});
`,
	},
];

const selectedExample = ref(EXAMPLES[0].label);
const code = ref(EXAMPLES[0].code);
const compilerResult = ref<CompilerResult | null>(null);
const activeTab = ref<'json' | 'errors'>('json');
const bottomPanelOpen = ref(false);
const iframeRef = ref<HTMLIFrameElement | null>(null);
const editorRef = ref<HTMLDivElement>();
const editor = ref<EditorView | null>(null);
const iframeReady = ref(false);
const pendingWorkflow = ref<WorkflowJSON | null>(null);

function onSelectExample(label: string) {
	const example = EXAMPLES.find((ex) => ex.label === label);
	if (!example) return;
	selectedExample.value = label;
	code.value = example.code;
	if (editor.value) {
		editor.value.dispatch({
			changes: { from: 0, to: editor.value.state.doc.length, insert: example.code },
		});
	}
	compile();
}

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
		void debouncedCompile();
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
