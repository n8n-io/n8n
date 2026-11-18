<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, useTemplateRef, watch } from 'vue';
import { watchDebounced } from '@vueuse/core';
import { Prec, type Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import {
	N8nButton,
	N8nCallout,
	N8nIconButton,
	N8nSegmentControl,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useClipboard } from '@n8n/composables/useClipboard';
import { useDeviceSupport } from '@n8n/composables/useDeviceSupport';
import { useToast } from '@n8n/composables/useToast';
import { isRecord } from '@n8n/utils/is-record';

import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useSetupPanelStore } from '@/features/setupPanel/setupPanel.store';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';

import WorkflowJsonEditor from './WorkflowJsonEditor.vue';
import WorkflowJsonReviewDialog from './WorkflowJsonReviewDialog.vue';
import { useCanvasSelectionBridge } from '../composables/useCanvasSelectionBridge';
import { useWorkflowJsonApply } from '../composables/useWorkflowJsonApply';
import { useWorkflowJsonEditorDeps } from '../composables/useWorkflowJsonEditorDeps';
import { workflowJsonAutocomplete } from '../workflowJsonCompletions';
import { summarizeIssues, workflowJsonLinter } from '../workflowJsonLint';
import { validateWorkflowJson } from '../workflowJsonValidation';
import type { WorkflowJson, WorkflowJsonIssue, WorkflowNodeRef } from '../workflowJson.types';
import type { WorkflowJsonApplyPlan } from '../workflowJsonChanges';
import { stringifyWorkflowJson, toWorkflowJson } from '../workflowJsonDocument';
import { useWorkflowJsonDraftStore } from '../workflowJsonDraft.store';

const props = defineProps<{
	isReadOnly: boolean;
}>();

type Mode = 'view' | 'edit';

const FLASH_DURATION = 3000;

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const clipboard = useClipboard();
const { controlKeyText } = useDeviceSupport();
const workflowDocumentStore = injectWorkflowDocumentStore();
const draftStore = useWorkflowJsonDraftStore();
const setupPanelStore = useSetupPanelStore();
const { selectedNodeIds, selectNodes, onNodeClick, isHiddenOnCanvas } = useCanvasSelectionBridge();
const workflowJsonApply = useWorkflowJsonApply();

const editor = useTemplateRef('editor');

const workflowId = computed(() => workflowDocumentStore.value.workflowId);
const draft = computed(() => draftStore.getDraft(workflowId.value));
// A draft survives a read-only phase (another tab holds the lock, archived, AI builder running) but cannot be edited then
const editing = computed(() => draft.value !== undefined && !props.isReadOnly);

const liveDoc = computed(() =>
	stringifyWorkflowJson(toWorkflowJson(workflowDocumentStore.value.serialize())),
);
// Dragging a node changes the document on every frame
const debouncedLiveDoc = ref(liveDoc.value);
watchDebounced(liveDoc, (doc) => (debouncedLiveDoc.value = doc), { debounce: 100 });
// After Apply, show the new document at once, not the one from before the debounce
watch(
	editing,
	(isEditing) => {
		if (!isEditing) debouncedLiveDoc.value = liveDoc.value;
	},
	{ flush: 'sync' },
);
const editorDoc = computed(() => draft.value?.doc ?? debouncedLiveDoc.value);
const canvasChanged = computed(
	() => draft.value !== undefined && draft.value.baseDoc !== liveDoc.value,
);

const mode = computed<Mode>({
	get: () => (editing.value ? 'edit' : 'view'),
	set: (value) => {
		if (value === 'edit') startEditing();
		else void stopEditing();
	},
});

const modeOptions = computed(() => [
	{ label: i18n.baseText('workflowJsonPanel.mode.view'), value: 'view' as const },
	{
		label: i18n.baseText('workflowJsonPanel.mode.edit'),
		value: 'edit' as const,
		disabled: props.isReadOnly,
	},
]);

const selectedNodes = computed<WorkflowNodeRef[]>(() =>
	selectedNodeIds.value.map((id) => ({
		id,
		name: workflowDocumentStore.value.getNodeById(id)?.name,
	})),
);

const isWorkflowJson = (value: unknown): value is WorkflowJson =>
	isRecord(value) && Array.isArray(value.nodes) && isRecord(value.connections);

const { validationDeps, completionDeps } = useWorkflowJsonEditorDeps();

// References that still use a node's old name resolve through the nodes from when editing started
const baseNodes = computed(() => {
	const base: unknown = draft.value ? JSON.parse(draft.value.baseDoc) : undefined;
	return isWorkflowJson(base) ? base.nodes.map(({ id, name }) => ({ id, name })) : [];
});

function getIssues(parsed: unknown): WorkflowJsonIssue[] {
	return validateWorkflowJson(parsed, validationDeps, { baseNodes: baseNodes.value });
}

type Validation = { syntaxError?: string; issues: WorkflowJsonIssue[]; json?: WorkflowJson };

function validate(doc: string): Validation {
	let parsed: unknown;
	try {
		parsed = JSON.parse(doc);
	} catch (error) {
		return { syntaxError: error instanceof Error ? error.message : String(error), issues: [] };
	}
	const issues = getIssues(parsed);
	return { issues, json: isWorkflowJson(parsed) ? parsed : undefined };
}

// Validated right away, so a restored draft never shows "No problems" for a moment
const validation = ref<Validation>(draft.value ? validate(draft.value.doc) : { issues: [] });
watchDebounced(
	() => draft.value?.doc,
	(doc) => {
		validation.value = doc === undefined ? { issues: [] } : validate(doc);
	},
	{ debounce: 300 },
);

const issueCounts = computed(() => summarizeIssues(validation.value.issues));
const errorCount = computed(() => issueCounts.value.errors);
const warningCount = computed(() => issueCounts.value.warnings);
const status = computed(() => {
	if (validation.value.syntaxError) return i18n.baseText('workflowJsonPanel.status.invalidJson');
	if (errorCount.value + warningCount.value === 0)
		return i18n.baseText('workflowJsonPanel.status.valid');
	const count = (key: 'errors' | 'warnings', value: number) =>
		i18n.baseText(`workflowJsonPanel.status.${key}`, {
			interpolate: { count: value },
			adjustToNumber: value,
		});
	return [
		errorCount.value > 0 ? count('errors', errorCount.value) : undefined,
		warningCount.value > 0 ? count('warnings', warningCount.value) : undefined,
	]
		.filter((part) => part !== undefined)
		.join(', ');
});
const hasBlockingProblem = computed(
	() => validation.value.syntaxError !== undefined || errorCount.value > 0,
);

const editExtensions: Extension[] = [
	Prec.high(
		keymap.of([
			{
				key: 'Mod-Enter',
				run: () => {
					void onReview();
					return true;
				},
			},
		]),
	),
	workflowJsonLinter(getIssues),
	workflowJsonAutocomplete(completionDeps),
];

function startEditing() {
	if (props.isReadOnly || editing.value) return;
	draftStore.startDraft(workflowId.value, liveDoc.value);
}

async function stopEditing() {
	const current = draft.value;
	if (!current) return;
	if (current.doc !== current.baseDoc) {
		const answer = await message.confirm(
			i18n.baseText('workflowJsonPanel.discardConfirm.message'),
			i18n.baseText('workflowJsonPanel.discardConfirm.title'),
			{
				confirmButtonText: i18n.baseText('workflowJsonPanel.discard'),
				cancelButtonText: i18n.baseText('generic.cancel'),
			},
		);
		if (answer !== MODAL_CONFIRM) return;
	}
	draftStore.clearDraft(workflowId.value);
}

function reloadFromCanvas() {
	draftStore.startDraft(workflowId.value, liveDoc.value);
	editor.value?.setDoc(liveDoc.value);
}

function onChange(doc: string) {
	draftStore.updateDraft(workflowId.value, doc);
}

function resolveNodeId(node: WorkflowNodeRef): string | undefined {
	const doc = workflowDocumentStore.value;
	if (node.id && doc.getNodeById(node.id)) return node.id;
	return node.name ? doc.getNodeByName(node.name)?.id : undefined;
}

function onSelectNodes(nodes: WorkflowNodeRef[]) {
	selectNodes(nodes.map(resolveNodeId).filter((id) => id !== undefined));
}

function onHoverNode(node: WorkflowNodeRef | null) {
	const id = node ? resolveNodeId(node) : undefined;
	if (id && !isHiddenOnCanvas(id)) setupPanelStore.setHighlightedNodes([id]);
	else setupPanelStore.clearHighlightedNodes();
}

onNodeClick(([id]) => {
	if (id) editor.value?.revealNode({ id, name: workflowDocumentStore.value.getNodeById(id)?.name });
});

onBeforeUnmount(() => setupPanelStore.clearHighlightedNodes());

async function onCopy() {
	await clipboard.copy(editor.value?.getDoc() ?? liveDoc.value);
	toast.showMessage({ title: i18n.baseText('workflowJsonPanel.copied'), type: 'success' });
}

function onFormat() {
	const result = validate(editor.value?.getDoc() ?? '');
	if (result.syntaxError) {
		toast.showMessage({
			type: 'error',
			title: i18n.baseText('workflowJsonPanel.status.invalidJson'),
			message: result.syntaxError,
		});
		return;
	}
	editor.value?.setDoc(JSON.stringify(JSON.parse(editor.value.getDoc()), null, 2));
}

const reviewOpen = ref(false);
const reviewPlan = shallowRef<WorkflowJsonApplyPlan>();
const reviewCurrent = shallowRef<WorkflowJson>();
const reviewWarnings = shallowRef<WorkflowJsonIssue[]>([]);
const applying = ref(false);

async function onReview() {
	if (!editing.value || reviewOpen.value) return;
	const result = validate(editor.value?.getDoc() ?? draft.value?.doc ?? '');
	validation.value = result;
	if (result.syntaxError) {
		toast.showMessage({
			type: 'error',
			title: i18n.baseText('workflowJsonPanel.status.invalidJson'),
			message: result.syntaxError,
		});
		return;
	}
	if (!result.json || result.issues.some((issue) => issue.severity === 'error')) {
		toast.showMessage({ type: 'error', title: i18n.baseText('workflowJsonPanel.fixErrors') });
		return;
	}

	let plan: WorkflowJsonApplyPlan;
	try {
		plan = workflowJsonApply.plan(result.json);
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowJsonPanel.applyFailed'));
		return;
	}
	if (!plan.hasChanges) {
		toast.showMessage({ type: 'info', title: i18n.baseText('workflowJsonPanel.noChanges') });
		return;
	}
	reviewCurrent.value = workflowJsonApply.currentWorkflowJson();
	reviewPlan.value = plan;
	reviewWarnings.value = result.issues.filter((issue) => issue.severity === 'warning');
	reviewOpen.value = true;
}

function flashNodes(ids: string[], className: string) {
	if (ids.length === 0) return;
	const emit = (add: boolean) =>
		canvasEventBus.emit('nodes:action', {
			ids,
			action: 'update:node:class',
			payload: { className, add },
		});
	// Wait until the canvas has rendered nodes that were just added
	setTimeout(() => emit(true), 50);
	setTimeout(() => emit(false), FLASH_DURATION);
}

watch(
	() => props.isReadOnly,
	(readOnly) => {
		if (readOnly && !applying.value) reviewOpen.value = false;
	},
);

async function onApply() {
	const plan = reviewPlan.value;
	if (!plan || props.isReadOnly) return;
	applying.value = true;
	try {
		const result = await workflowJsonApply.apply(plan);
		reviewOpen.value = false;
		draftStore.clearDraft(workflowId.value);

		const addedIds = new Set(plan.added.map((node) => node.id));
		flashNodes([...addedIds], 'ai-diff-added');
		flashNodes(
			[...new Set(result.changedNodeIds)].filter((id) => !addedIds.has(id)),
			'ai-diff-modified',
		);

		toast.showMessage({
			type: 'success',
			title: i18n.baseText('workflowJsonPanel.applied.title'),
			message: i18n.baseText('workflowJsonPanel.applied.message', {
				interpolate: { shortcut: `${controlKeyText.value}+Z` },
			}),
		});
		const problems = [
			...result.refusedConnections.map((change) =>
				i18n.baseText('workflowJsonPanel.applied.refusedConnection', {
					interpolate: { source: change.sourceName, target: change.targetName },
				}),
			),
			...result.renamedOnApply.map((entry) =>
				i18n.baseText('workflowJsonPanel.applied.renamed', { interpolate: entry }),
			),
		];
		if (problems.length > 0) {
			toast.showMessage({
				type: 'warning',
				title: i18n.baseText('workflowJsonPanel.applied.partial'),
				message: problems.join('\n'),
				duration: 0,
			});
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowJsonPanel.applyFailed'));
	} finally {
		applying.value = false;
	}
}
</script>

<template>
	<div :class="$style.panel" data-test-id="workflow-json-panel">
		<div :class="$style.toolbar">
			<N8nSegmentControl
				v-model="mode"
				:options="modeOptions"
				size="small"
				data-test-id="workflow-json-mode"
			/>
			<div :class="$style.actions">
				<N8nTooltip
					:content="
						editing
							? i18n.baseText('workflowJsonPanel.findAndReplace')
							: i18n.baseText('workflowJsonPanel.find')
					"
					placement="bottom"
				>
					<N8nIconButton
						variant="ghost"
						size="small"
						icon="search"
						:aria-label="i18n.baseText('workflowJsonPanel.find')"
						data-test-id="workflow-json-find"
						@click="editor?.openSearch()"
					/>
				</N8nTooltip>
				<N8nTooltip
					v-if="editing"
					:content="i18n.baseText('workflowJsonPanel.format')"
					placement="bottom"
				>
					<N8nIconButton
						variant="ghost"
						size="small"
						icon="align-right"
						:aria-label="i18n.baseText('workflowJsonPanel.format')"
						data-test-id="workflow-json-format"
						@click="onFormat"
					/>
				</N8nTooltip>
				<N8nTooltip :content="i18n.baseText('workflowJsonPanel.copy')" placement="bottom">
					<N8nIconButton
						variant="ghost"
						size="small"
						icon="copy"
						:aria-label="i18n.baseText('workflowJsonPanel.copy')"
						data-test-id="workflow-json-copy"
						@click="onCopy"
					/>
				</N8nTooltip>
			</div>
		</div>
		<N8nCallout v-if="canvasChanged" theme="warning" :class="$style.callout">
			{{ i18n.baseText('workflowJsonPanel.canvasChanged') }}
			<template #trailingContent>
				<N8nButton
					variant="ghost"
					size="small"
					:label="i18n.baseText('workflowJsonPanel.reload')"
					data-test-id="workflow-json-reload"
					@click="reloadFromCanvas"
				/>
			</template>
		</N8nCallout>
		<WorkflowJsonEditor
			ref="editor"
			:class="$style.editor"
			:doc="editorDoc"
			:editing="editing"
			:selected-nodes="selectedNodes"
			:edit-extensions="editExtensions"
			@select-nodes="onSelectNodes"
			@hover-node="onHoverNode"
			@change="onChange"
		/>
		<div :class="$style.footer">
			<template v-if="editing">
				<N8nText
					size="small"
					:color="hasBlockingProblem ? 'danger' : warningCount > 0 ? 'warning' : 'success'"
					data-test-id="workflow-json-status"
				>
					{{ status }}
				</N8nText>
				<div :class="$style.footerActions">
					<N8nButton
						variant="ghost"
						size="small"
						:label="i18n.baseText('workflowJsonPanel.discard')"
						data-test-id="workflow-json-discard"
						@click="stopEditing"
					/>
					<N8nTooltip :content="`${controlKeyText}+Enter`" placement="top">
						<N8nButton
							size="small"
							:disabled="hasBlockingProblem"
							:label="i18n.baseText('workflowJsonPanel.review')"
							data-test-id="workflow-json-review"
							@click="onReview"
						/>
					</N8nTooltip>
				</div>
			</template>
			<N8nText v-else size="small" color="text-light">
				{{
					isReadOnly
						? i18n.baseText('workflowJsonPanel.readOnly')
						: i18n.baseText('workflowJsonPanel.hint.view')
				}}
			</N8nText>
		</div>
		<WorkflowJsonReviewDialog
			v-if="reviewPlan && reviewCurrent"
			v-model:open="reviewOpen"
			:plan="reviewPlan"
			:current="reviewCurrent"
			:warnings="reviewWarnings"
			:applying="applying"
			:return-focus="editing"
			@apply="onApply"
		/>
	</div>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
}

.toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-bottom: var(--border);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	margin-left: auto;
}

.callout {
	margin: var(--spacing--3xs) var(--spacing--2xs);
}

.editor {
	flex: 1;
	min-height: 0;
}

.footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	min-height: var(--spacing--xl);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-top: var(--border);
}

.footerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}
</style>
