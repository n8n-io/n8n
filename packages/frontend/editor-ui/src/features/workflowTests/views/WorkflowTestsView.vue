<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nCallout,
	N8nHeading,
	N8nIcon,
	N8nIconButton,
	N8nLoading,
	N8nSegmentControl,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useEventListener } from '@vueuse/core';
import { computed, inject, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import { useRouter } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { useUIStore } from '@/app/stores/ui.store';
import InstanceAiChatPanel from '@/features/ai/instanceAi/embed/InstanceAiChatPanel.vue';
import JsEditor from '@/features/shared/editors/components/JsEditor/JsEditor.vue';

import WorkflowTestTree from '../components/WorkflowTestTree.vue';
import WorkflowTestsSummary from '../components/WorkflowTestsSummary.vue';
import { useWorkflowTestsAssistant } from '../useWorkflowTestsAssistant';
import {
	buildTestTree,
	countTests,
	type WorkflowTestRow,
	type WorkflowTestTreeItem,
} from '../workflowTests.display';
import { useWorkflowTestsStore } from '../workflowTests.store';
import { parseTestFile } from '../workflowTests.utils';

const props = defineProps<{ workflowId: string }>();

const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const uiStore = useUIStore();
const rbacStore = useRBACStore();
const testsStore = useWorkflowTestsStore();
const workflowDocumentStore = inject(WorkflowDocumentStoreKey, null);

const workflow = computed(() => ({
	id: props.workflowId,
	name: workflowDocumentStore?.value?.name ?? '',
	homeProjectId: workflowDocumentStore?.value?.homeProject?.id,
}));
const assistant = useWorkflowTestsAssistant(workflow);

type Mode = 'results' | 'code';

const isLoading = ref(true);
const isSaving = ref(false);
const mode = ref<Mode>('results');
const draft = ref('');
const file = computed(() => testsStore.files[props.workflowId] ?? null);
const run = computed(() => testsStore.runs[props.workflowId]);
const isRunning = computed(() => run.value?.status === 'running');
const isDirty = computed(() => draft.value !== (file.value?.source ?? ''));
const canRun = computed(() => rbacStore.hasScope('workflow:execute'));
const workflowHasUnsavedChanges = computed(() => uiStore.stateIsDirty);

const modeOptions = computed(() => [
	{ label: i18n.baseText('workflowTests.view.results'), value: 'results' as const },
	{ label: i18n.baseText('workflowTests.view.code'), value: 'code' as const },
]);

const tree = computed(() =>
	buildTestTree(parseTestFile(file.value?.source ?? ''), run.value?.tests ?? [], isRunning.value),
);
const testCounts = computed(() => countTests(tree.value));

/**
 * Open state by full name. Groups start open. A test starts closed, unless it
 * failed, so the error is visible without a click.
 */
const expanded = ref<Record<string, boolean>>({});

function isExpanded(item: WorkflowTestTreeItem) {
	return expanded.value[item.fullName] ?? (item.kind === 'group' || item.status === 'failed');
}

function toggle(fullName: string, value: boolean) {
	expanded.value[fullName] = value;
}

function nodeId(name: string) {
	return workflowDocumentStore?.value?.getNodeByName(name)?.id;
}

function canOpenNode(row: WorkflowTestRow) {
	return !!row.error?.node && !!nodeId(row.error.node);
}

function openNode(name: string) {
	const id = nodeId(name);
	if (!id) return;
	void router.push({ name: VIEWS.WORKFLOW, params: { workflowId: props.workflowId, nodeId: id } });
}

// ── Loading ──────────────────────────────────────────────────────────────────────

async function load() {
	try {
		const loaded = await testsStore.fetchFile(props.workflowId);
		if (!isDirty.value || !loaded) draft.value = loaded?.source ?? '';
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowTests.error.load'));
	} finally {
		isLoading.value = false;
	}
}

// A save from another browser tab (for example the full Assistant) arrives through a reload.
useEventListener(document, 'visibilitychange', () => {
	if (document.visibilityState === 'visible' && !isDirty.value) void load();
});

// Keep the editor in step with a new source, unless the user typed.
watch(
	() => file.value?.source,
	(source, previous) => {
		if (draft.value === (previous ?? '')) draft.value = source ?? '';
	},
);

watch(() => props.workflowId, load);
onMounted(load);

// ── Actions ──────────────────────────────────────────────────────────────────────

async function save() {
	isSaving.value = true;
	try {
		await testsStore.saveFile(props.workflowId, draft.value);
		toast.showMessage({ title: i18n.baseText('workflowTests.saved'), type: 'success' });
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowTests.error.save'));
	} finally {
		isSaving.value = false;
	}
}

async function runAll() {
	mode.value = 'results';
	try {
		await testsStore.runFile(props.workflowId);
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowTests.error.run'));
	}
}

// ── Assistant panel ────────────────────────────────────────────────────────────────

const panelRef = useTemplateRef<InstanceType<typeof InstanceAiChatPanel>>('panelRef');
const isPanelOpen = ref(true);
const threadId = ref<string>();
const showPanel = computed(() => assistant.available.value && assistant.subject.value !== null);

const SUBMIT_RETRY_MS = 300;
const SUBMIT_MAX_TRIES = 40;
let submitTimer: ReturnType<typeof setTimeout> | undefined;
onBeforeUnmount(() => clearTimeout(submitTimer));

/**
 * Sends a prompt to the panel with the `workflow-tests` hand-off, so the server
 * loads the skill. The panel mounts its conversation after it finds or creates
 * the thread, so a send right after opening the panel waits for it.
 */
function askAssistant(prompt: string, suggestionId: string) {
	isPanelOpen.value = true;
	clearTimeout(submitTimer);
	let tries = 0;
	const trySubmit = () => {
		const panel = panelRef.value;
		if (panel?.submitSuggestion) {
			panel.handoff({ source: 'workflow-tests', workflowId: props.workflowId });
			const sent = panel.submitSuggestion({
				prompt,
				suggestionId,
				suggestionKind: 'prompt',
				position: 0,
				prefillType: 'handoff_workflow_tests',
			});
			if (sent) return;
		}
		if (++tries < SUBMIT_MAX_TRIES) submitTimer = setTimeout(trySubmit, SUBMIT_RETRY_MS);
	};
	trySubmit();
}

function generate() {
	askAssistant(i18n.baseText('workflowTests.generate.prompt'), 'workflow-tests-generate');
}

function fixTest(row: WorkflowTestRow) {
	const error = [row.error?.code, row.error?.node, row.error?.message].filter(Boolean).join('\n');
	askAssistant(
		i18n.baseText('workflowTests.fix.prompt', { interpolate: { name: row.fullName, error } }),
		'workflow-tests-fix',
	);
}

function startWriting() {
	mode.value = 'code';
}
</script>

<template>
	<div :class="$style.layout" data-testid="workflow-tests-view">
		<main :class="$style.main">
			<N8nLoading v-if="isLoading" :rows="5" />

			<div v-else-if="!file && mode === 'results'" :class="$style.empty">
				<span :class="$style.emptyIcon"><N8nIcon icon="flask-conical" size="xlarge" /></span>
				<N8nHeading tag="h2" size="large">{{
					i18n.baseText('workflowTests.empty.title')
				}}</N8nHeading>
				<N8nText color="text-light" align="center">
					{{ i18n.baseText('workflowTests.empty.description') }}
				</N8nText>
				<div :class="$style.actions">
					<N8nTooltip
						:disabled="showPanel"
						:content="i18n.baseText('workflowTests.generate.unavailable')"
					>
						<N8nButton
							variant="brand"
							:disabled="!showPanel"
							data-testid="workflow-tests-generate"
							data-attr="workflow-tests-generate"
							@click="generate"
						>
							<template #icon><N8nIcon icon="sparkles" /></template>
							{{ i18n.baseText('workflowTests.generate') }}
						</N8nButton>
					</N8nTooltip>
					<N8nButton variant="outline" data-testid="workflow-tests-write" @click="startWriting">
						{{ i18n.baseText('workflowTests.empty.write') }}
					</N8nButton>
				</div>
			</div>

			<template v-else>
				<div :class="$style.toolbar">
					<N8nSegmentControl v-model="mode" :options="modeOptions" size="small" />
					<div :class="$style.spacer" />
					<N8nButton
						v-if="isDirty"
						variant="outline"
						size="small"
						:loading="isSaving"
						data-testid="workflow-tests-save"
						@click="save"
					>
						{{ i18n.baseText('workflowTests.save') }}
					</N8nButton>
					<N8nButton
						v-if="showPanel"
						variant="outline"
						size="small"
						data-testid="workflow-tests-generate"
						data-attr="workflow-tests-generate"
						@click="generate"
					>
						<template #icon><N8nIcon icon="sparkles" /></template>
						{{ i18n.baseText('workflowTests.generate') }}
					</N8nButton>
					<N8nTooltip
						:disabled="canRun && !isDirty"
						:content="
							canRun
								? i18n.baseText('workflowTests.unsaved')
								: i18n.baseText('workflowTests.runOwnerOnly')
						"
					>
						<N8nButton
							size="small"
							:loading="isRunning"
							:disabled="!file || isDirty || !canRun"
							data-testid="workflow-tests-run-all"
							data-attr="workflow-tests-run-all"
							@click="runAll"
						>
							<template #icon><N8nIcon icon="play" /></template>
							{{
								isRunning
									? i18n.baseText('workflowTests.running')
									: i18n.baseText('workflowTests.runAll')
							}}
						</N8nButton>
					</N8nTooltip>
					<N8nTooltip
						v-if="showPanel"
						:content="
							isPanelOpen
								? i18n.baseText('workflowTests.assistant.hide')
								: i18n.baseText('workflowTests.assistant.show')
						"
					>
						<N8nIconButton
							icon="panel-right"
							variant="ghost"
							size="small"
							:aria-label="
								isPanelOpen
									? i18n.baseText('workflowTests.assistant.hide')
									: i18n.baseText('workflowTests.assistant.show')
							"
							data-testid="workflow-tests-toggle-assistant"
							@click="isPanelOpen = !isPanelOpen"
						/>
					</N8nTooltip>
				</div>

				<N8nCallout v-if="workflowHasUnsavedChanges" theme="warning" slim>
					{{ i18n.baseText('workflowTests.workflowUnsaved') }}
				</N8nCallout>

				<template v-if="mode === 'results'">
					<WorkflowTestsSummary :run="run" :test-counts="testCounts" />

					<N8nCallout
						v-if="run?.status === 'error'"
						theme="danger"
						data-testid="workflow-tests-run-error"
					>
						<pre :class="$style.runError">{{ run.errors.join('\n') }}</pre>
					</N8nCallout>

					<N8nText v-if="testCounts.total === 0" color="text-light">
						{{ i18n.baseText('workflowTests.noTestsFound') }}
					</N8nText>

					<WorkflowTestTree
						:items="tree"
						:is-expanded="isExpanded"
						:can-open-node="canOpenNode"
						:can-fix="showPanel"
						@toggle="toggle"
						@fix="fixTest"
						@show-code="mode = 'code'"
						@open-node="openNode"
					/>
				</template>

				<div v-else :class="$style.editor" data-testid="workflow-tests-editor">
					<JsEditor v-model="draft" fill-parent />
				</div>
			</template>
		</main>

		<aside
			v-if="showPanel && assistant.subject.value"
			v-show="isPanelOpen"
			:class="$style.assistant"
			data-testid="workflow-tests-assistant"
		>
			<InstanceAiChatPanel
				ref="panelRef"
				v-model:thread-id="threadId"
				:subject="assistant.subject.value"
				:launch="assistant.launch.value"
				:visible="isPanelOpen"
				:show-open-full-assistant="true"
				@close="isPanelOpen = false"
			/>
		</aside>
	</div>
</template>

<style module lang="scss">
.layout {
	display: flex;
	height: 100%;
	width: 100%;
	min-height: 0;
}

.main {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	flex: 1;
	min-width: 0;
	padding: var(--spacing--lg);
	overflow: auto;
}

.assistant {
	// No size token fits a side panel. This matches the width of a chat column.
	flex: 0 0 min(40%, 30rem);
	min-width: 0;
	border-left: var(--border);
	background-color: var(--background--surface);
}

.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--sm);
	max-width: 32rem;
	margin: var(--spacing--3xl) auto 0;
	text-align: center;
}

.emptyIcon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--3xl);
	height: var(--spacing--3xl);
	border-radius: 50%;
	color: var(--color--primary);
	background-color: color-mix(in srgb, var(--color--primary) 10%, transparent);
}

.actions {
	display: flex;
	gap: var(--spacing--xs);
	margin-top: var(--spacing--xs);
}

.toolbar {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.spacer {
	flex: 1;
}

.runError {
	margin: 0;
	white-space: pre-wrap;
	word-break: break-word;
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
}

.editor {
	flex: 1;
	min-height: 0;
	border: var(--border);
	border-radius: var(--radius);
	overflow: hidden;
}
</style>
