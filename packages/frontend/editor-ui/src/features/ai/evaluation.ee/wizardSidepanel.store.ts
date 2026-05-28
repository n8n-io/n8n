import { STORES } from '@n8n/stores';
import type { ChatHubLLMProvider } from '@n8n/api-types';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import type { CannedMetricKey } from './evaluation.constants';
import { useFocusPanelStore } from '@/app/stores/focusPanel.store';

export type WizardStep = 0 | 1 | 2;

// Per-metric LLM judge selection captured in step 1. Stored using the chat-hub
// provider key (e.g. 'openai'); the EvaluationConfig DTO uses the langchain
// node-type form (e.g. '@n8n/n8n-nodes-langchain.lmChatOpenAi') — the
// conversion happens at persistence time.
export type JudgeSelection = {
	provider: ChatHubLLMProvider;
	credentialId: string;
	model: string;
};

// User-defined scorer captured via the "+ New custom scorer" modal in step 1.
// `id` is generated client-side so we can key list rendering and remove a
// specific entry without re-keying the others.
//
// Only expression-based custom scorers are supported for now — the Set
// Metrics node doesn't expose a fully custom LLM judge yet, so we don't let
// the wizard pretend it does. The two canned LLM judge presets (correctness,
// helpfulness) remain available as canned metrics.
export type CustomScorer = {
	id: string;
	name: string;
	expression: string;
};

export const useEvaluationsWizardSidepanelStore = defineStore(
	STORES.EVALUATIONS_WIZARD_SIDEPANEL,
	() => {
		// The wizard now lives as a tab inside the FocusSidebar — its visibility
		// is fully derived from the focus panel store (sidebar open AND the
		// evaluations tab selected). Existing callers can still read `isOpen` /
		// call `open()` / `close()` as before; those just route through the
		// focus panel store under the hood.
		const focusPanelStore = useFocusPanelStore();
		const isOpen = computed(
			() => focusPanelStore.focusPanelActive && focusPanelStore.selectedTab === 'evaluations',
		);
		const activeStep = ref<WizardStep>(0);

		// Step 1 — canned metric keys the user picked from the Set Metrics
		// operation list (correctness, helpfulness, …).
		const selectedMetricKeys = ref<CannedMetricKey[]>([]);

		// Step 1 — per-LLM-judge metric provider/credential/model. Only entries
		// for metrics in LLM_JUDGE_METRIC_KEYS are populated.
		const judgeSelectionByMetric = ref<Partial<Record<CannedMetricKey, JudgeSelection>>>({});

		// Step 2 — what part of the workflow gets evaluated.
		//
		// Default: a single AI root node (the wizard pre-selects the first one
		// in the workflow). `aiNodeName` is the evaluated end-of-slice; the
		// upstream is inferred from the workflow's connections.
		//
		// When the user picks "Extend to a slice", `isSliceMode` flips on and
		// the wizard exposes explicit Start + End pickers. `endNodeName` is
		// seeded from `aiNodeName` at that transition so the user can extend
		// the slice without losing their AI-node pick.
		const aiNodeName = ref<string>('');
		const isSliceMode = ref(false);
		const startNodeName = ref<string>('');
		const endNodeName = ref<string>('');

		// Step 2 — first dataset row. Keyed by column name (input field name or
		// expected-field name like 'expectedAnswer'/'expectedTools') so we can
		// directly persist to a Data table on Next.
		const inputs = ref<Record<string, string>>({});
		const expectedValues = ref<Record<string, string>>({});

		// Step 1 — user-defined scorers built via the "+ New custom scorer"
		// modal. Persists in-memory only for now; no backend wiring yet.
		const customScorers = ref<CustomScorer[]>([]);
		const isCustomScorerModalOpen = ref(false);

		// Step 3 — the test run dispatched by this wizard session, by id. We
		// can't rely on "the most recent run in the store" because the runs
		// map gets populated by `fetchTestRuns` which returns ALL of a
		// workflow's runs (older user-triggered runs included). Pinning the
		// active run id at dispatch time lets step 3 wait for the run we
		// actually started.
		const activeRunId = ref<string | null>(null);

		// Wipe everything the user can interact with so reopening the wizard on
		// a different workflow doesn't leak the previous workflow's metric
		// picks, judge models, or dataset values into the new session.
		function resetState() {
			activeStep.value = 0;
			selectedMetricKeys.value = [];
			judgeSelectionByMetric.value = {};
			aiNodeName.value = '';
			isSliceMode.value = false;
			startNodeName.value = '';
			endNodeName.value = '';
			inputs.value = {};
			expectedValues.value = {};
			customScorers.value = [];
			isCustomScorerModalOpen.value = false;
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
			}
		}

		function goBack() {
			if (activeStep.value === 2) {
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

		// Switch to slice mode and seed the End picker from the current AI node
		// pick so the user keeps their progress as the form expands. Caller is
		// expected to set startNodeName separately (typically left blank for the
		// user to fill in).
		function enterSliceMode() {
			if (isSliceMode.value) return;
			isSliceMode.value = true;
			if (!endNodeName.value && aiNodeName.value) {
				endNodeName.value = aiNodeName.value;
			}
		}

		// Collapse back to the single-AI-node picker. The slice start is cleared
		// because it's no longer meaningful, but `aiNodeName` is kept — that's
		// the value the collapsed form binds to.
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

		function openCustomScorerModal() {
			isCustomScorerModalOpen.value = true;
		}

		function closeCustomScorerModal() {
			isCustomScorerModalOpen.value = false;
		}

		function addCustomScorer(scorer: Omit<CustomScorer, 'id'>) {
			const id = crypto.randomUUID();
			customScorers.value = [...customScorers.value, { ...scorer, id }];
		}

		function removeCustomScorer(id: string) {
			customScorers.value = customScorers.value.filter((s) => s.id !== id);
		}

		function setActiveRunId(id: string | null) {
			activeRunId.value = id;
		}

		// Seeds `inputs` from execution data while preserving anything the user
		// has touched — including intentionally cleared fields. Drops any keys
		// no longer present in `values` so a previous slice's stale fields
		// don't linger in the row we eventually persist.
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
			customScorers,
			isCustomScorerModalOpen,
			activeRunId,
			open,
			close,
			toggle,
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
			openCustomScorerModal,
			closeCustomScorerModal,
			addCustomScorer,
			removeCustomScorer,
			setActiveRunId,
		};
	},
);
