import { STORES } from '@n8n/stores';
import type { ChatHubLLMProvider } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import type { CannedMetricKey } from './evaluation.constants';
import { DEFAULT_SELECTED_METRIC_KEYS } from './evaluation.constants';
import { useFocusPanelStore } from '@/app/stores/focusPanel.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';

export type WizardStep = 0 | 1 | 2 | 3;

// Stored as the chat-hub provider key ('openai'); persistence converts to
// the langchain node-type form ('@n8n/n8n-nodes-langchain.lmChatOpenAi').
export type JudgeSelection = {
	provider: ChatHubLLMProvider;
	credentialId: string;
	model: string;
};

export type CustomCheck = {
	id: string;
	name: string;
	expression: string;
};

export const useEvaluationsWizardSidepanelStore = defineStore(
	STORES.EVALUATIONS_WIZARD_SIDEPANEL,
	() => {
		const focusPanelStore = useFocusPanelStore();
		const isOpen = computed(
			() => focusPanelStore.focusPanelActive && focusPanelStore.selectedTab === 'evaluations',
		);
		const activeStep = ref<WizardStep>(0);
		const selectedMetricKeys = ref<CannedMetricKey[]>([...DEFAULT_SELECTED_METRIC_KEYS]);
		const judgeSelectionByMetric = ref<Partial<Record<CannedMetricKey, JudgeSelection>>>({});
		const aiNodeName = ref<string>('');
		const isSliceMode = ref(false);
		const startNodeName = ref<string>('');
		const endNodeName = ref<string>('');
		const inputs = ref<Record<string, string>>({});
		const expectedValues = ref<Record<string, string>>({});
		// Expected-output values for every dataset row, indexed by position (which
		// matches a test case's 0-based `runIndex`). `expectedValues` above only
		// holds the first row for the Step-2 form; the results pane reads this so
		// each case shows its own row instead of repeating the first.
		const datasetExpectedByRow = ref<Array<Record<string, string>>>([]);
		// Per-row INPUT values, indexed by dataset position (mirrors
		// `datasetExpectedByRow` which holds per-row expected values).
		const datasetInputsByRow = ref<Array<Record<string, string>>>([]);
		// Per-row user-facing case names, indexed by dataset position. Empty string
		// for rows without a name (older rows, or before one is typed).
		const datasetNamesByRow = ref<string[]>([]);
		// The name of the case currently open in the detail view.
		const caseName = ref<string>('');
		// Off for "start from scratch": the field shape still comes from the last
		// run, but the values stay blank instead of being prefilled from it.
		const prefillInputsFromExecution = ref(true);
		// Tests panel navigation — which screen is visible.
		// list: results list (index) · create: execution picker · detail: case form.
		const viewMode = ref<'list' | 'create' | 'detail'>('list');
		// 0-based data-table row index currently open in the detail view;
		// null means a new test case is being added.
		const activeRowIndex = ref<number | null>(null);
		// Resolved data-table row id for the active row (existing rows only);
		// null when unknown or when adding a new test case.
		const activeRowId = ref<number | null>(null);
		// A successful, non-eval execution chosen as the base for a NEW test case.
		// When set, `useSliceInputs` resolves the input shape from it (top priority)
		// so the detail form is prefilled. Cleared when editing an existing row or
		// returning to the list.
		const seedExecution = ref<IExecutionResponse | null>(null);
		// A seed handed off from another view (e.g. the executions page): applied
		// once the panel opens and hydration has run, so the config (node) is known
		// before we prefill. Bookkeeping — intentionally NOT cleared by resetState
		// so it survives the reset that fires on a cross-view workflow (re)mount.
		const pendingSeedExecution = ref<IExecutionResponse | null>(null);
		const customChecks = ref<CustomCheck[]>([]);
		const isCustomCheckModalOpen = ref(false);
		// Pinned at dispatch — fetchTestRuns returns ALL of a workflow's runs,
		// so "newest in map" can't identify the run THIS session started.
		const activeRunId = ref<string | null>(null);
		// The workflow the wizard state currently belongs to. Survives the pane's
		// unmount (the focus panel closes between workflows), so a remount on a
		// different workflow can still detect the switch and reset. Intentionally
		// NOT cleared by resetState — it's bookkeeping, not wizard content.
		const lastWorkflowId = ref<string>('');

		// The node whose output is a case's answer.
		const answerNodeName = computed(() =>
			isSliceMode.value ? endNodeName.value || '' : aiNodeName.value || '',
		);

		function resetState() {
			activeStep.value = 0;
			// Correctness is pre-selected for every fresh wizard ("we've selected it
			// for you"). Hydration overrides this when a saved config exists.
			selectedMetricKeys.value = [...DEFAULT_SELECTED_METRIC_KEYS];
			judgeSelectionByMetric.value = {};
			aiNodeName.value = '';
			isSliceMode.value = false;
			startNodeName.value = '';
			endNodeName.value = '';
			inputs.value = {};
			expectedValues.value = {};
			datasetExpectedByRow.value = [];
			datasetInputsByRow.value = [];
			datasetNamesByRow.value = [];
			caseName.value = '';
			prefillInputsFromExecution.value = true;
			viewMode.value = 'list';
			activeRowIndex.value = null;
			activeRowId.value = null;
			seedExecution.value = null;
			customChecks.value = [];
			isCustomCheckModalOpen.value = false;
			activeRunId.value = null;
		}

		function open(step: WizardStep = 0) {
			resetState();
			activeStep.value = step;
			focusPanelStore.setSelectedTab('evaluations');
			focusPanelStore.openFocusPanel();
		}

		function close() {
			focusPanelStore.closeFocusPanel();
		}

		function toggle() {
			if (isOpen.value) close();
			else open(activeStep.value);
		}

		function setStep(step: WizardStep) {
			activeStep.value = step;
		}

		function goNext() {
			if (activeStep.value === 0) {
				activeStep.value = 1;
			} else if (activeStep.value === 1) {
				activeStep.value = 2;
			} else if (activeStep.value === 2) {
				activeStep.value = 3;
			}
		}

		function goBack() {
			if (activeStep.value === 3) {
				activeStep.value = 2;
			} else if (activeStep.value === 2) {
				activeStep.value = 1;
			} else if (activeStep.value === 1) {
				activeStep.value = 0;
			}
		}

		function toggleMetric(key: CannedMetricKey) {
			const index = selectedMetricKeys.value.indexOf(key);
			if (index === -1) {
				selectedMetricKeys.value = [...selectedMetricKeys.value, key];
			} else {
				selectedMetricKeys.value = selectedMetricKeys.value.filter((_, i) => i !== index);
			}
		}

		function setJudgeSelection(key: CannedMetricKey, selection: JudgeSelection | undefined) {
			if (selection === undefined) {
				const next = { ...judgeSelectionByMetric.value };
				delete next[key];
				judgeSelectionByMetric.value = next;
				return;
			}
			judgeSelectionByMetric.value = { ...judgeSelectionByMetric.value, [key]: selection };
		}

		function setAiNodeName(name: string) {
			aiNodeName.value = name;
		}

		function enterSliceMode() {
			if (isSliceMode.value) return;
			isSliceMode.value = true;
			if (!endNodeName.value && aiNodeName.value) {
				endNodeName.value = aiNodeName.value;
			}
		}

		function exitSliceMode() {
			isSliceMode.value = false;
			startNodeName.value = '';
		}

		function setInputValue(name: string, value: string) {
			inputs.value = { ...inputs.value, [name]: value };
		}

		function setExpectedValue(name: string, value: string) {
			expectedValues.value = { ...expectedValues.value, [name]: value };
		}

		function openCustomCheckModal() {
			isCustomCheckModalOpen.value = true;
		}

		function closeCustomCheckModal() {
			isCustomCheckModalOpen.value = false;
		}

		function addCustomCheck(check: Omit<CustomCheck, 'id'>) {
			const id = nanoid();
			customChecks.value = [...customChecks.value, { ...check, id }];
		}

		function removeCustomCheck(id: string) {
			customChecks.value = customChecks.value.filter((s) => s.id !== id);
		}

		function updateCustomCheck(id: string, patch: Partial<Omit<CustomCheck, 'id'>>) {
			customChecks.value = customChecks.value.map((c) => (c.id === id ? { ...c, ...patch } : c));
		}

		function setActiveRunId(id: string | null) {
			activeRunId.value = id;
		}

		function setLastWorkflowId(id: string) {
			lastWorkflowId.value = id;
		}

		function openList() {
			viewMode.value = 'list';
			seedExecution.value = null;
		}

		function openCreate() {
			viewMode.value = 'create';
			seedExecution.value = null;
		}

		// Opens the case detail AND seeds the form for it: for an existing row it
		// loads that row's inputs/expected/name; for a new case (index null) it
		// clears them. Also resets `activeRowId`/`seedExecution`. This is where
		// `inputs`/`expectedValues`/`caseName` get reassigned on navigation.
		function openDetail(index: number | null) {
			viewMode.value = 'detail';
			activeRowIndex.value = index;
			if (index === null) {
				activeRowId.value = null;
				caseName.value = '';
			} else {
				// Editing an existing row uses its saved data, never a seed execution.
				seedExecution.value = null;
				// Clear a row id carried over from a previously-open case — a stale id
				// would make an edit/delete hit the WRONG row (re-resolved by index).
				activeRowId.value = null;
				// Load THIS row's saved input/expected values into the form. Without
				// this the form keeps showing row 0 (the only row hydration seeds).
				const rowInputs = datasetInputsByRow.value[index];
				const rowExpected = datasetExpectedByRow.value[index];
				if (rowInputs) inputs.value = { ...rowInputs };
				if (rowExpected) expectedValues.value = { ...rowExpected };
				caseName.value = datasetNamesByRow.value[index] ?? '';
			}
		}

		function setCaseName(name: string) {
			caseName.value = name;
		}

		function setPrefillInputsFromExecution(value: boolean) {
			prefillInputsFromExecution.value = value;
		}

		function setSeedExecution(execution: IExecutionResponse | null) {
			seedExecution.value = execution;
		}

		function setPendingSeedExecution(execution: IExecutionResponse | null) {
			pendingSeedExecution.value = execution;
		}

		function setActiveRow(index: number | null, id: number | null) {
			activeRowIndex.value = index;
			activeRowId.value = id;
		}

		// Preserves user edits (including intentionally cleared fields).
		function seedInputs(values: Record<string, string>) {
			const next: Record<string, string> = { ...values };
			for (const k of Object.keys(values)) {
				if (k in inputs.value) next[k] = inputs.value[k];
			}
			inputs.value = next;
		}

		return {
			isOpen,
			activeStep,
			selectedMetricKeys,
			judgeSelectionByMetric,
			aiNodeName,
			isSliceMode,
			startNodeName,
			endNodeName,
			inputs,
			expectedValues,
			datasetExpectedByRow,
			datasetInputsByRow,
			datasetNamesByRow,
			caseName,
			prefillInputsFromExecution,
			viewMode,
			activeRowIndex,
			activeRowId,
			seedExecution,
			pendingSeedExecution,
			customChecks,
			isCustomCheckModalOpen,
			activeRunId,
			lastWorkflowId,
			answerNodeName,
			open,
			close,
			toggle,
			reset: resetState,
			setStep,
			goNext,
			goBack,
			toggleMetric,
			setJudgeSelection,
			setAiNodeName,
			enterSliceMode,
			exitSliceMode,
			setInputValue,
			setExpectedValue,
			seedInputs,
			openCustomCheckModal,
			closeCustomCheckModal,
			addCustomCheck,
			removeCustomCheck,
			updateCustomCheck,
			setActiveRunId,
			setLastWorkflowId,
			openList,
			openCreate,
			openDetail,
			setCaseName,
			setPrefillInputsFromExecution,
			setSeedExecution,
			setPendingSeedExecution,
			setActiveRow,
		};
	},
);
