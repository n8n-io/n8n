<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nCallout,
	N8nIcon,
	N8nIconButton,
	N8nLoading,
	N8nResizeWrapper,
	N8nSegmentControl,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useElementSize, useEventListener } from '@vueuse/core';
import { computed, inject, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import { useRouter } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { useUIStore } from '@/app/stores/ui.store';
import InstanceAiChatPanel from '@/features/ai/instanceAi/embed/InstanceAiChatPanel.vue';

import WorkflowTestTree from '../components/WorkflowTestTree.vue';
import WorkflowTestsCanvas from '../components/WorkflowTestsCanvas.vue';
import WorkflowTestsEditor from '../components/WorkflowTestsEditor.vue';
import WorkflowTestsEmptyState from '../components/WorkflowTestsEmptyState.vue';
import WorkflowTestsSummary from '../components/WorkflowTestsSummary.vue';
import { useWorkflowTestsAssistant } from '../useWorkflowTestsAssistant';
import {
	buildTestTree,
	countTests,
	flattenTests,
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

type View = 'results' | 'workflow' | 'code';

const isLoading = ref(true);
const isSaving = ref(false);
const isWriting = ref(false);
const view = ref<View>('results');
const draft = ref('');
const file = computed(() => testsStore.files[props.workflowId] ?? null);
const run = computed(() => testsStore.runs[props.workflowId]);
const isRunning = computed(() => run.value?.status === 'running');
const isDirty = computed(() => draft.value !== (file.value?.source ?? ''));
const canRun = computed(() => rbacStore.hasScope('workflow:execute'));
const workflowHasUnsavedChanges = computed(() => uiStore.stateIsDirty);
const showEmptyState = computed(() => !file.value && !isWriting.value);

const centreOptions = computed(() => [
	{ label: i18n.baseText('workflowTests.view.workflow'), value: 'workflow' as const },
	{ label: i18n.baseText('workflowTests.view.code'), value: 'code' as const },
]);
const narrowOptions = computed(() => [
	{ label: i18n.baseText('workflowTests.view.results'), value: 'results' as const },
	...centreOptions.value,
]);

const runLabel = computed(() => {
	if (isRunning.value) return i18n.baseText('workflowTests.running');
	if (isDirty.value) return i18n.baseText('workflowTests.saveAndRun');
	return i18n.baseText('workflowTests.runAll');
});

// ── Layout ───────────────────────────────────────────────────────────────────────

/** Below this width of the main column, the results and the editor do not fit side by side. */
const SPLIT_MIN_WIDTH = 720;

const mainRef = useTemplateRef<HTMLElement>('mainRef');
const { width: mainWidth } = useElementSize(mainRef);
const isNarrow = computed(() => mainWidth.value > 0 && mainWidth.value < SPLIT_MIN_WIDTH);
const showResults = computed(() => !isNarrow.value || view.value === 'results');
const showEditor = computed(() => view.value === 'code');
const showCanvas = computed(
	() => !showEditor.value && (!isNarrow.value || view.value === 'workflow'),
);

/** The centre pane of the wide layout. The results have their own pane there. */
const centreView = computed({
	get: () => (view.value === 'code' ? 'code' : 'workflow'),
	set: (value) => {
		view.value = value;
	},
});

// ── Results ──────────────────────────────────────────────────────────────────────

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

const editorRef = useTemplateRef<InstanceType<typeof WorkflowTestsEditor>>('editorRef');
const resultsRef = useTemplateRef<HTMLElement>('resultsRef');
const selectedName = ref<string>();
const lineToReveal = ref<number>();

const allRows = computed(() => flattenTests(tree.value));
const selectedRow = computed(() =>
	allRows.value.find((row) => row.fullName === selectedName.value),
);
const canvasRows = computed(() => (selectedRow.value ? [selectedRow.value] : allRows.value));

function revealLine() {
	if (lineToReveal.value !== undefined && showEditor.value) {
		editorRef.value?.revealLine(lineToReveal.value);
	}
}

/** A second click on the selected test shows all tests again. */
function selectTest(row: WorkflowTestRow) {
	const isSelected = selectedName.value === row.fullName;
	selectedName.value = isSelected ? undefined : row.fullName;
	if (row.error) toggle(row.fullName, !isSelected);
	lineToReveal.value = row.line;
	revealLine();
}

function showInCode(line: number) {
	lineToReveal.value = line;
	view.value = 'code';
	revealLine();
}

watch(view, revealLine, { flush: 'post' });

watch(
	() => run.value?.status,
	(status) => {
		if (status !== 'failed') return;
		resultsRef.value?.querySelector('[data-status="failed"]')?.scrollIntoView({ block: 'nearest' });
	},
	{ flush: 'post' },
);

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

watch(
	() => props.workflowId,
	() => {
		isWriting.value = false;
		selectedName.value = undefined;
		lineToReveal.value = undefined;
		void load();
	},
);
onMounted(load);

// ── Actions ──────────────────────────────────────────────────────────────────────

async function save() {
	isSaving.value = true;
	try {
		await testsStore.saveFile(props.workflowId, draft.value);
		toast.showMessage({ title: i18n.baseText('workflowTests.saved'), type: 'success' });
		return true;
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowTests.error.save'));
		return false;
	} finally {
		isSaving.value = false;
	}
}

async function runAll() {
	if (isDirty.value && !(await save())) return;
	if (isNarrow.value) view.value = 'results';
	try {
		await testsStore.runFile(props.workflowId);
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowTests.error.run'));
	}
}

function startWriting() {
	isWriting.value = true;
	view.value = 'code';
}

// ── Assistant panel ────────────────────────────────────────────────────────────────

const PANEL_DEFAULT_WIDTH = 420;
const PANEL_MIN_WIDTH = 320;
const PANEL_MAX_WIDTH = 720;

const panelRef = useTemplateRef<InstanceType<typeof InstanceAiChatPanel>>('panelRef');
const isPanelOpen = ref(true);
const panelWidth = ref(PANEL_DEFAULT_WIDTH);
const threadId = ref<string>();
const isAssistantWorking = ref(false);
const showPanel = computed(() => assistant.available.value && assistant.subject.value !== null);
const panelToggleLabel = computed(() =>
	isPanelOpen.value
		? i18n.baseText('workflowTests.assistant.hide')
		: i18n.baseText('workflowTests.assistant.show'),
);

// The Assistant saves the file on the server. The tab shows it when the Assistant stops.
watch(isAssistantWorking, (working) => {
	if (!working && !isDirty.value) void load();
});

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

function fixRun() {
	askAssistant(
		i18n.baseText('workflowTests.fixRun.prompt', {
			interpolate: { error: run.value?.errors.join('\n') ?? '' },
		}),
		'workflow-tests-fix',
	);
}
</script>

<template>
	<div :class="$style.layout" data-testid="workflow-tests-view">
		<main ref="mainRef" :class="$style.main">
			<div v-if="isLoading" :class="$style.panes">
				<div :class="[$style.pane, $style.resultsPane]"><N8nLoading :rows="6" /></div>
				<div :class="[$style.pane, $style.editorPane]"><N8nLoading :rows="10" /></div>
			</div>

			<WorkflowTestsEmptyState
				v-else-if="showEmptyState"
				:is-assistant-working="isAssistantWorking"
				:can-generate="showPanel"
				@generate="generate"
				@write="startWriting"
			/>

			<template v-else>
				<WorkflowTestsSummary :run="run" :test-counts="testCounts">
					<template #actions>
						<N8nSegmentControl
							v-if="isNarrow"
							v-model="view"
							:options="narrowOptions"
							size="small"
						/>
						<span
							v-if="!canRun"
							:class="$style.noPermission"
							data-testid="workflow-tests-no-permission"
						>
							<N8nIcon icon="lock" size="small" />
							<N8nText size="small">{{ i18n.baseText('workflowTests.runOwnerOnly') }}</N8nText>
						</span>
						<N8nButton
							v-if="showPanel"
							variant="ghost"
							size="small"
							data-testid="workflow-tests-generate"
							data-attr="workflow-tests-generate"
							@click="generate"
						>
							<template #icon><N8nIcon icon="sparkles" /></template>
							{{ i18n.baseText('workflowTests.generate') }}
						</N8nButton>
						<N8nButton
							size="small"
							:loading="isRunning"
							:disabled="!canRun || (!file && !isDirty)"
							data-testid="workflow-tests-run-all"
							data-attr="workflow-tests-run-all"
							@click="runAll"
						>
							<template #icon><N8nIcon icon="play" /></template>
							{{ runLabel }}
						</N8nButton>
						<N8nTooltip v-if="showPanel" :content="panelToggleLabel">
							<N8nIconButton
								icon="panel-right"
								variant="ghost"
								size="small"
								:aria-label="panelToggleLabel"
								data-testid="workflow-tests-toggle-assistant"
								@click="isPanelOpen = !isPanelOpen"
							/>
						</N8nTooltip>
					</template>
				</WorkflowTestsSummary>

				<N8nCallout v-if="workflowHasUnsavedChanges" theme="warning" slim>
					{{ i18n.baseText('workflowTests.workflowUnsaved') }}
				</N8nCallout>

				<div :class="$style.panes">
					<section
						v-show="showResults"
						ref="resultsRef"
						:class="[$style.pane, $style.resultsPane]"
						data-testid="workflow-tests-results"
					>
						<div
							v-if="run?.status === 'error'"
							:class="$style.runError"
							data-testid="workflow-tests-run-error"
						>
							<pre :class="$style.runErrorMessage">{{ run.errors.join('\n') }}</pre>
							<div v-if="showPanel">
								<N8nButton
									size="small"
									variant="outline"
									data-testid="workflow-tests-run-fix"
									data-attr="workflow-tests-run-fix"
									@click="fixRun"
								>
									<template #icon><N8nIcon icon="sparkles" /></template>
									{{ i18n.baseText('workflowTests.row.fixWithAssistant') }}
								</N8nButton>
							</div>
						</div>

						<N8nText v-if="testCounts.total === 0" size="small" color="text-light">
							{{ i18n.baseText('workflowTests.noTestsFound') }}
						</N8nText>

						<WorkflowTestTree
							:items="tree"
							:is-expanded="isExpanded"
							:can-open-node="canOpenNode"
							:can-fix="showPanel"
							:selected-name="selectedName"
							@toggle="toggle"
							@select="selectTest"
							@fix="fixTest"
							@open-node="openNode"
						/>
					</section>

					<WorkflowTestsCanvas
						v-if="showCanvas"
						:class="$style.editorPane"
						:rows="canvasRows"
						:selected-name="selectedRow?.fullName"
						@show-in-code="showInCode"
						@clear-selection="selectedName = undefined"
					>
						<template v-if="!isNarrow" #switch>
							<N8nSegmentControl v-model="centreView" :options="centreOptions" size="small" />
						</template>
					</WorkflowTestsCanvas>

					<WorkflowTestsEditor
						v-show="showEditor"
						ref="editorRef"
						v-model="draft"
						:class="$style.editorPane"
						:is-dirty="isDirty"
						:is-saving="isSaving"
						@save="save"
					>
						<template v-if="!isNarrow" #switch>
							<N8nSegmentControl v-model="centreView" :options="centreOptions" size="small" />
						</template>
					</WorkflowTestsEditor>
				</div>
			</template>
		</main>

		<N8nResizeWrapper
			v-if="showPanel && assistant.subject.value"
			v-show="isPanelOpen"
			:class="$style.assistant"
			:width="panelWidth"
			:default-width="PANEL_DEFAULT_WIDTH"
			:min-width="PANEL_MIN_WIDTH"
			:max-width="PANEL_MAX_WIDTH"
			:supported-directions="['left']"
			:grid-size="8"
			role="complementary"
			data-testid="workflow-tests-assistant"
			@resize="panelWidth = $event.width"
		>
			<InstanceAiChatPanel
				ref="panelRef"
				v-model:thread-id="threadId"
				:subject="assistant.subject.value"
				:launch="assistant.launch.value"
				:visible="isPanelOpen"
				:show-open-full-assistant="true"
				@close="isPanelOpen = false"
				@update:working="isAssistantWorking = $event"
			/>
		</N8nResizeWrapper>
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
	flex-shrink: 0;
	min-height: 0;
	width: calc(v-bind(panelWidth) * 1px);
	max-width: 50%;
	border-left: var(--border);
	background-color: var(--background--surface);
}

.noPermission {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	color: var(--color--text--tint-1);
}

.panes {
	display: flex;
	gap: var(--spacing--sm);
	flex: 1;
	min-height: 0;
}

.pane {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-width: 0;
	padding: var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--surface);
	overflow: auto;
}

.resultsPane {
	flex: 2 1 0;
}

.editorPane {
	flex: 3 1 0;
}

.runError {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-left: var(--border-width) solid var(--color--danger);
	border-radius: var(--radius--3xs);
	background-color: color-mix(in srgb, var(--color--danger) 6%, transparent);
}

.runErrorMessage {
	margin: 0;
	white-space: pre-wrap;
	word-break: break-word;
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
	color: var(--color--text--shade-1);
}
</style>
