import { STORES } from '@n8n/stores';
import type { ChatHubLLMProvider } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import type { CannedMetricKey } from './evaluation.constants';
import { DEFAULT_SELECTED_METRIC_KEYS } from './evaluation.constants';
import { useFocusPanelStore } from '@/app/stores/focusPanel.store';

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

		function setActiveRunId(id: string | null) {
			activeRunId.value = id;
		}

		function setLastWorkflowId(id: string) {
			lastWorkflowId.value = id;
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
			customChecks,
			isCustomCheckModalOpen,
			activeRunId,
			lastWorkflowId,
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
			setActiveRunId,
			setLastWorkflowId,
		};
	},
);
