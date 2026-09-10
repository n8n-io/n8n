<script setup lang="ts">
/**
 * The drafted cases of one dataset: a list to review, edit, add to and run.
 *
 * Framed as drafts throughout — the tag says they were AI-written and the
 * subtitle says nothing is graded automatically, because the checks are notes for
 * the person reviewing the run, not assertions the runner enforces.
 */
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nCard,
	N8nIcon,
	N8nLoading,
	N8nText,
} from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import { MODAL_CONFIRM } from '@/app/constants';

import { useAgentEvalsStore } from '../agentEvals.store';
import type { AgentEvalCase, AgentEvalDataTableDataset } from '../agentEvals.types';
import { useAgentConfirmationModal } from '../composables/useAgentConfirmationModal';
import { useAgentEvalRunProgress } from '../composables/useAgentEvalRunProgress';
import { toCaseSource } from '../utils/agentEvalCases.utils';
import AgentEvalCaseEditor from './AgentEvalCaseEditor.vue';
import AgentEvalCaseRow from './AgentEvalCaseRow.vue';

type AgentEvalCaseValue = Pick<AgentEvalCase, 'input' | 'whatToCheck'>;

const props = defineProps<{
	projectId: string;
	agentId: string;
	dataset: AgentEvalDataTableDataset;
	/** No `agent:update` — the list is readable but nothing can be changed. */
	disabled?: boolean;
	/** `agent:execute`, which a viewer holds without holding update. */
	canRun?: boolean;
	generating?: boolean;
}>();

const emit = defineEmits<{
	regenerate: [];
}>();

const store = useAgentEvalsStore();
const i18n = useI18n();
const { showError, showMessage } = useToast();
const { openAgentConfirmationModal } = useAgentConfirmationModal();

// Null when the dataset's mapping names no input column: the rows exist but this
// view has no honest way to write them, so it renders read-only.
const source = computed(() => toCaseSource(props.dataset));
const isRequestOnly = computed(() => source.value?.columns.whatToCheck === null);

/** True when the last read of this dataset's rows failed, so the list is unknown rather than empty. */
const loadFailed = ref(false);

// Writing is withheld while the rows are unknown: adding a case on top of rows we
// failed to read would report a count that doesn't match the table.
const isEditable = computed(() => !props.disabled && source.value !== null && !loadFailed.value);

const editingRowId = ref<number | null>(null);
const isAddingCase = ref(false);
const savingDraft = ref(false);
// Tracked separately from the store's per-row flag so a removal spins the Remove
// button rather than Save.
const removingRowId = ref<number | null>(null);

const cases = computed(() => store.getCases(props.dataset.id));
// The server's total, not the loaded page: a run covers every row in the table.
const caseCount = computed(() => store.getCasesCount(props.dataset.id));
const isLoading = computed(
	() => store.isLoadingCases(props.dataset.id) && !store.areCasesLoaded(props.dataset.id),
);

// Rows past the page this view reads are neither shown nor editable, yet a run
// covers them — so say so rather than letting the count and the list disagree in
// silence.
const hiddenCaseCount = computed(() => Math.max(0, caseCount.value - cases.value.length));

// Destructured so the template reads the refs directly — properties of a returned
// object are not unwrapped the way top-level setup bindings are.
const {
	summary,
	isRunning,
	isStarting,
	isCancelling,
	isResolving,
	lostTrack,
	startRun,
	cancelRun,
} = useAgentEvalRunProgress({
	projectId: () => props.projectId,
	agentId: () => props.agentId,
	datasetId: () => props.dataset.id,
});

const isInFlight = computed(() => isStarting.value || isRunning.value);

// Cancelling is `agent:update` server-side, not `agent:execute` — it stops work
// someone else may have started. So a viewer who can start a run genuinely cannot
// stop it, and the control is absent rather than present-and-failing.
const canCancel = computed(() => !props.disabled);

const runAllLabel = computed(() =>
	i18n.baseText('agents.builder.agentEvals.cases.runAll', {
		adjustToNumber: caseCount.value,
		interpolate: { count: String(caseCount.value) },
	}),
);

// The design shows only the idle card, so this is the minimum honest addition:
// what the run is doing, where the footer otherwise has empty space.
const runStatus = computed(() => {
	if (lostTrack.value) return i18n.baseText('agents.builder.agentEvals.run.lostTrack');
	if (isStarting.value) return i18n.baseText('agents.builder.agentEvals.run.starting');
	if (!isRunning.value) return null;

	const counts = summary.value;
	// Between starting and the first summary there is nothing to count yet.
	if (!counts) return i18n.baseText('agents.builder.agentEvals.run.starting');

	return i18n.baseText('agents.builder.agentEvals.run.progress', {
		interpolate: { done: String(counts.total - counts.pending), total: String(counts.total) },
	});
});

async function loadCases() {
	const current = source.value;
	if (!current) return;

	loadFailed.value = false;
	try {
		await store.fetchCases(props.projectId, current);
	} catch (error) {
		// Recorded as state, not just a toast: an empty row list is indistinguishable
		// from a dataset that genuinely has no cases, and adding one on top of rows we
		// failed to read would report a case count that doesn't match the table.
		loadFailed.value = true;
		showError(error, i18n.baseText('agents.builder.agentEvals.cases.loadError'));
	}
}

// Reads the rows whenever the dataset changes — including the new dataset a
// regeneration produces, since generating creates a dataset rather than replacing one.
watch(
	[() => props.projectId, () => props.dataset.id],
	async () => {
		editingRowId.value = null;
		isAddingCase.value = false;

		await loadCases();
	},
	{ immediate: true },
);

// One editor open at a time, so there is never a question of which pending edit a
// save applies to.
function onEdit(rowId: number) {
	isAddingCase.value = false;
	editingRowId.value = rowId;
}

function onAddCase() {
	editingRowId.value = null;
	isAddingCase.value = true;
}

async function onSaveCase(rowId: number, value: AgentEvalCaseValue) {
	const current = source.value;
	if (!current) return;

	try {
		const updated = await store.updateCase(props.projectId, current, rowId, value);
		if (!updated) {
			showMessage({
				title: i18n.baseText('agents.builder.agentEvals.case.saveError'),
				type: 'error',
			});
			return;
		}

		editingRowId.value = null;
	} catch (error) {
		showError(error, i18n.baseText('agents.builder.agentEvals.case.saveError'));
	}
}

async function onSaveDraft(value: AgentEvalCaseValue) {
	const current = source.value;
	if (!current) return;

	savingDraft.value = true;
	try {
		await store.createCase(props.projectId, current, value);
		isAddingCase.value = false;
	} catch (error) {
		showError(error, i18n.baseText('agents.builder.agentEvals.case.addError'));
	} finally {
		savingDraft.value = false;
	}
}

// No second confirmation: reaching this already took opening the editor, and a
// drafted case is cheap to write again.
async function onRemoveCase(rowId: number) {
	const current = source.value;
	if (!current) return;

	removingRowId.value = rowId;
	try {
		const removed = await store.deleteCase(props.projectId, current, rowId);
		if (!removed) {
			showMessage({
				title: i18n.baseText('agents.builder.agentEvals.case.removeError'),
				type: 'error',
			});
			return;
		}

		editingRowId.value = null;
	} catch (error) {
		showError(error, i18n.baseText('agents.builder.agentEvals.case.removeError'));
	} finally {
		removingRowId.value = null;
	}
}

// Confirmed because regenerating spends model credits and moves the view to a
// fresh dataset, leaving the reviewed set behind.
async function onRegenerate() {
	const confirmed = await openAgentConfirmationModal({
		title: i18n.baseText('agents.builder.agentEvals.regenerate.confirm.title'),
		description: i18n.baseText('agents.builder.agentEvals.regenerate.confirm.description'),
		confirmButtonText: i18n.baseText('agents.builder.agentEvals.regenerate.confirm.confirmButton'),
		cancelButtonText: i18n.baseText('agents.builder.agentEvals.regenerate.confirm.cancelButton'),
	});
	if (confirmed !== MODAL_CONFIRM) return;

	emit('regenerate');
}
</script>

<template>
	<N8nCard :class="$style.card" data-testid="agent-evals-cases-card">
		<div :class="$style.header">
			<div :class="$style.headerRow">
				<N8nBadge theme="secondary" :show-border="false" :class="$style.tag">
					<N8nIcon icon="sparkles" size="xsmall" />
					{{ i18n.baseText('agents.builder.agentEvals.cases.tag') }}
				</N8nBadge>

				<div :class="$style.spacer" />

				<N8nButton
					v-if="!disabled"
					variant="ghost"
					size="small"
					type="button"
					icon="refresh-cw"
					:loading="generating"
					data-testid="agent-evals-regenerate"
					@click="onRegenerate"
				>
					{{ i18n.baseText('agents.builder.agentEvals.cases.regenerate') }}
				</N8nButton>
			</div>

			<N8nText tag="h3" size="large" color="text-dark" bold :class="$style.title">
				{{ i18n.baseText('agents.builder.agentEvals.cases.title') }}
			</N8nText>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('agents.builder.agentEvals.cases.description') }}
			</N8nText>
		</div>

		<N8nCallout
			v-if="!source"
			theme="info"
			:class="$style.notice"
			data-testid="agent-evals-cases-unmapped"
		>
			{{ i18n.baseText('agents.builder.agentEvals.cases.unmapped') }}
		</N8nCallout>

		<N8nCallout
			v-if="loadFailed"
			theme="danger"
			:class="$style.notice"
			data-testid="agent-evals-cases-load-failed"
		>
			{{ i18n.baseText('agents.builder.agentEvals.cases.loadError') }}
			<template #actions>
				<N8nButton
					variant="ghost"
					size="small"
					type="button"
					data-testid="agent-evals-cases-retry"
					@click="loadCases"
				>
					{{ i18n.baseText('agents.builder.agentEvals.cases.retry') }}
				</N8nButton>
			</template>
		</N8nCallout>

		<N8nCallout
			v-if="hiddenCaseCount > 0"
			theme="warning"
			:class="$style.notice"
			data-testid="agent-evals-cases-truncated"
		>
			{{
				i18n.baseText('agents.builder.agentEvals.cases.truncated', {
					adjustToNumber: hiddenCaseCount,
					interpolate: { shown: String(cases.length), hidden: String(hiddenCaseCount) },
				})
			}}
		</N8nCallout>

		<div v-if="isLoading" :class="$style.loading" data-testid="agent-evals-cases-loading">
			<N8nLoading variant="p" :rows="4" />
		</div>

		<div v-else :class="$style.rows">
			<template v-for="(evalCase, position) in cases" :key="evalCase.rowId">
				<AgentEvalCaseEditor
					v-if="editingRowId === evalCase.rowId"
					:input="evalCase.input"
					:what-to-check="evalCase.whatToCheck"
					:request-only="isRequestOnly"
					removable
					:saving="
						store.isMutatingCase(dataset.id, evalCase.rowId) && removingRowId !== evalCase.rowId
					"
					:removing="removingRowId === evalCase.rowId"
					@save="onSaveCase(evalCase.rowId, $event)"
					@cancel="editingRowId = null"
					@remove="onRemoveCase(evalCase.rowId)"
				/>
				<AgentEvalCaseRow
					v-else
					:index="position + 1"
					:input="evalCase.input"
					:what-to-check="evalCase.whatToCheck"
					:editable="isEditable"
					@edit="onEdit(evalCase.rowId)"
				/>
			</template>

			<AgentEvalCaseEditor
				v-if="isAddingCase"
				input=""
				what-to-check=""
				:request-only="isRequestOnly"
				:saving="savingDraft"
				@save="onSaveDraft"
				@cancel="isAddingCase = false"
			/>
		</div>

		<div :class="$style.footer">
			<N8nButton
				v-if="isEditable"
				variant="ghost"
				size="small"
				type="button"
				icon="plus"
				:disabled="isAddingCase"
				data-testid="agent-evals-add-case"
				@click="onAddCase"
			>
				{{ i18n.baseText('agents.builder.agentEvals.cases.addCase') }}
			</N8nButton>

			<div :class="$style.spacer" />

			<N8nText
				v-if="runStatus"
				size="small"
				color="text-light"
				data-testid="agent-evals-run-status"
			>
				{{ runStatus }}
			</N8nText>

			<N8nButton
				v-if="isInFlight && canCancel"
				variant="subtle"
				size="medium"
				type="button"
				icon="filled-square"
				:loading="isCancelling"
				data-testid="agent-evals-cancel-run"
				@click="cancelRun"
			>
				{{ i18n.baseText('agents.builder.agentEvals.run.cancel') }}
			</N8nButton>
			<N8nButton
				v-else
				variant="solid"
				size="medium"
				type="button"
				icon="play"
				:disabled="!canRun || caseCount === 0 || lostTrack || isResolving"
				:loading="isInFlight"
				data-testid="agent-evals-run-all"
				@click="startRun"
			>
				{{ runAllLabel }}
			</N8nButton>
		</div>
	</N8nCard>
</template>

<style lang="scss" module>
/* Padding is per-section so the row dividers can span the full card width, as in
   the design, rather than stopping short at a card-level inset. */
.card {
	--card--padding: 0;

	width: 100%;
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--sm);
}

.headerRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--3xs);
}

.tag {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
}

.title {
	margin: 0;
}

.spacer {
	flex: 1;
}

.notice {
	margin: 0 var(--spacing--sm) var(--spacing--sm);
}

.loading {
	padding: 0 var(--spacing--sm) var(--spacing--sm);
}

.rows {
	display: flex;
	flex-direction: column;

	> * + * {
		border-top: var(--border);
	}
}

.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	border-top: var(--border);
}
</style>
