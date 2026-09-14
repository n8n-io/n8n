import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useEvaluationsWizardSidepanelStore } from './wizardSidepanel.store';

// Avoid activating the real focus-panel store: its `watch()` / `watchOnce()`
// subscriptions outlive the test and have surfaced as post-teardown
// unhandled rejections on Node 24. The wizard store only consumes a small
// surface — mirror it with a plain reactive stub.
const focusPanelState = vi.hoisted(() => ({
	focusPanelActive: false,
	selectedTab: 'focus' as string,
}));

vi.mock('@/app/stores/focusPanel.store', () => ({
	useFocusPanelStore: () => ({
		get focusPanelActive() {
			return focusPanelState.focusPanelActive;
		},
		get selectedTab() {
			return focusPanelState.selectedTab;
		},
		setSelectedTab(tab: string) {
			focusPanelState.selectedTab = tab;
		},
		openFocusPanel() {
			focusPanelState.focusPanelActive = true;
		},
		closeFocusPanel() {
			focusPanelState.focusPanelActive = false;
		},
	}),
}));

describe('wizardSidepanel.store', () => {
	beforeEach(() => {
		focusPanelState.focusPanelActive = false;
		focusPanelState.selectedTab = 'focus';
		setActivePinia(createPinia());
	});

	it('opens closed by default', () => {
		const store = useEvaluationsWizardSidepanelStore();
		expect(store.isOpen).toBe(false);
		expect(store.activeStep).toBe(0);
	});

	it('open() sets isOpen and switches to the given step', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(1);
		expect(store.isOpen).toBe(true);
		expect(store.activeStep).toBe(1);
	});

	it('close() resets isOpen', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(0);
		store.close();
		expect(store.isOpen).toBe(false);
	});

	it('goNext() advances through all 4 steps and stops at step 3', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(0);
		expect(store.activeStep).toBe(0);
		store.goNext();
		expect(store.activeStep).toBe(1);
		store.goNext();
		expect(store.activeStep).toBe(2);
		store.goNext();
		expect(store.activeStep).toBe(3);
		// Calling goNext at the last step is a no-op
		store.goNext();
		expect(store.activeStep).toBe(3);
	});

	it('goBack() retreats through all 4 steps and stops at step 0', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(3);
		expect(store.activeStep).toBe(3);
		store.goBack();
		expect(store.activeStep).toBe(2);
		store.goBack();
		expect(store.activeStep).toBe(1);
		store.goBack();
		expect(store.activeStep).toBe(0);
		// Calling goBack at the first step is a no-op
		store.goBack();
		expect(store.activeStep).toBe(0);
	});

	it('selectedMetricKeys defaults to correctness (pre-selected for the user)', () => {
		const store = useEvaluationsWizardSidepanelStore();
		expect(store.selectedMetricKeys).toEqual(['correctness']);
	});

	it('toggleMetric() adds a metric and removes it on second call', () => {
		const store = useEvaluationsWizardSidepanelStore();
		// Correctness is selected by default.
		expect(store.selectedMetricKeys).toEqual(['correctness']);
		store.toggleMetric('helpfulness');
		expect(store.selectedMetricKeys).toEqual(['correctness', 'helpfulness']);
		store.toggleMetric('helpfulness');
		expect(store.selectedMetricKeys).toEqual(['correctness']);
	});

	it('defaults to single-AI-node mode (slice mode off, no node picked)', () => {
		const store = useEvaluationsWizardSidepanelStore();
		expect(store.isSliceMode).toBe(false);
		expect(store.aiNodeName).toBe('');
	});

	it('enterSliceMode() seeds the End picker from the current AI node', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.setAiNodeName('AI Agent');
		store.enterSliceMode();
		expect(store.isSliceMode).toBe(true);
		expect(store.endNodeName).toBe('AI Agent');
	});

	it('exitSliceMode() clears Start but keeps the AI node pick', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.setAiNodeName('AI Agent');
		store.enterSliceMode();
		store.startNodeName = 'Trigger';
		store.exitSliceMode();
		expect(store.isSliceMode).toBe(false);
		expect(store.startNodeName).toBe('');
		expect(store.aiNodeName).toBe('AI Agent');
	});

	it('opens and closes the custom check modal', () => {
		const store = useEvaluationsWizardSidepanelStore();
		expect(store.isCustomCheckModalOpen).toBe(false);
		store.openCustomCheckModal();
		expect(store.isCustomCheckModalOpen).toBe(true);
		store.closeCustomCheckModal();
		expect(store.isCustomCheckModalOpen).toBe(false);
	});

	it('adds an expression custom check with a generated id', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.addCustomCheck({
			name: 'Length',
			expression: '{{ $json.output.length > 0 }}',
		});
		expect(store.customChecks).toHaveLength(1);
		expect(store.customChecks[0]).toMatchObject({ name: 'Length' });
		expect(store.customChecks[0].id).toEqual(expect.any(String));
	});

	it('removes a custom check by id', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.addCustomCheck({ name: 'A', expression: '1' });
		store.addCustomCheck({ name: 'B', expression: '2' });
		const idToRemove = store.customChecks[0].id;
		store.removeCustomCheck(idToRemove);
		expect(store.customChecks).toHaveLength(1);
		expect(store.customChecks[0].name).toBe('B');
	});

	it('resets custom checks and modal state when the wizard reopens', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.addCustomCheck({ name: 'A', expression: '1' });
		store.openCustomCheckModal();
		store.open(0);
		expect(store.customChecks).toEqual([]);
		expect(store.isCustomCheckModalOpen).toBe(false);
	});

	it('reset() clears all wizard state back to defaults', () => {
		const store = useEvaluationsWizardSidepanelStore();

		// Set some state (correctness is on by default; add another to differ from defaults)
		store.setStep(2);
		store.toggleMetric('toolsUsed');
		store.setAiNodeName('AI Agent');
		store.setInputValue('input1', 'hello');
		store.addCustomCheck({ name: 'Check A', expression: '1 === 1' });
		store.openCustomCheckModal();
		store.setActiveRunId('run-99');
		store.setLastWorkflowId('wf-1');

		// Confirm state was applied
		expect(store.activeStep).toBe(2);
		expect(store.selectedMetricKeys).toEqual(['correctness', 'toolsUsed']);
		expect(store.aiNodeName).toBe('AI Agent');
		expect(store.inputs).toEqual({ input1: 'hello' });
		expect(store.customChecks).toHaveLength(1);
		expect(store.isCustomCheckModalOpen).toBe(true);
		expect(store.activeRunId).toBe('run-99');

		// Reset and assert all back to defaults
		store.reset();

		expect(store.activeStep).toBe(0);
		// Reset restores the default pre-selection, not an empty list.
		expect(store.selectedMetricKeys).toEqual(['correctness']);
		expect(store.judgeSelectionByMetric).toEqual({});
		expect(store.aiNodeName).toBe('');
		expect(store.isSliceMode).toBe(false);
		expect(store.startNodeName).toBe('');
		expect(store.endNodeName).toBe('');
		expect(store.inputs).toEqual({});
		expect(store.expectedValues).toEqual({});
		expect(store.customChecks).toEqual([]);
		expect(store.isCustomCheckModalOpen).toBe(false);
		expect(store.activeRunId).toBeNull();
		// lastWorkflowId is bookkeeping that must survive reset so a remount on a
		// different workflow can still detect the switch.
		expect(store.lastWorkflowId).toBe('wf-1');
	});

	// ── New Tests Panel fields ────────────────────────────────────────────────

	it('viewMode defaults to "list"', () => {
		const store = useEvaluationsWizardSidepanelStore();
		expect(store.viewMode).toBe('list');
	});

	it('activeRowIndex defaults to null', () => {
		const store = useEvaluationsWizardSidepanelStore();
		expect(store.activeRowIndex).toBeNull();
	});

	it('activeRowId defaults to null', () => {
		const store = useEvaluationsWizardSidepanelStore();
		expect(store.activeRowId).toBeNull();
	});

	it('datasetInputsByRow defaults to an empty array', () => {
		const store = useEvaluationsWizardSidepanelStore();
		expect(store.datasetInputsByRow).toEqual([]);
	});

	it('openDetail(3) sets viewMode to "detail" and activeRowIndex to 3', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.openDetail(3);
		expect(store.viewMode).toBe('detail');
		expect(store.activeRowIndex).toBe(3);
	});

	it('openDetail(null) sets viewMode to "detail", activeRowIndex to null, and clears activeRowId', () => {
		const store = useEvaluationsWizardSidepanelStore();
		// Simulate a prior setActiveRow call so activeRowId is non-null
		store.setActiveRow(2, 99);
		expect(store.activeRowId).toBe(99);
		store.openDetail(null);
		expect(store.viewMode).toBe('detail');
		expect(store.activeRowIndex).toBeNull();
		expect(store.activeRowId).toBeNull();
	});

	it('openDetail(index) clears activeRowId so persistence re-resolves by index', () => {
		const store = useEvaluationsWizardSidepanelStore();
		// A stale id carried over from a previously-open case (here row 5) must not
		// leak into a different case — otherwise an edit/delete would hit the wrong
		// row. openDetail clears it so the id is re-resolved from the index.
		store.setActiveRow(5, 99);
		store.openDetail(2);
		expect(store.activeRowIndex).toBe(2);
		expect(store.activeRowId).toBeNull();
	});

	it('setPendingSeedExecution stores the seed and reset() preserves it (cross-view handoff)', () => {
		const store = useEvaluationsWizardSidepanelStore();
		const exec = { id: 'exec-1' } as never;
		store.setPendingSeedExecution(exec);
		expect(store.pendingSeedExecution).toEqual(exec);
		// Bookkeeping — must survive the reset that fires on a cross-view remount.
		store.reset();
		expect(store.pendingSeedExecution).toEqual(exec);
		store.setPendingSeedExecution(null);
		expect(store.pendingSeedExecution).toBeNull();
	});

	it("openDetail(index) loads that row's input and expected values into the form", () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.datasetInputsByRow = [{ q: 'first' }, { q: 'second' }, { q: 'third' }];
		store.datasetExpectedByRow = [
			{ expectedAnswer: 'a1' },
			{ expectedAnswer: 'a2' },
			{ expectedAnswer: 'a3' },
		];

		store.openDetail(2);

		expect(store.inputs).toEqual({ q: 'third' });
		expect(store.expectedValues).toEqual({ expectedAnswer: 'a3' });
	});

	it('openDetail(null) does NOT overwrite the form from row data', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.datasetInputsByRow = [{ q: 'first' }];
		store.datasetExpectedByRow = [{ expectedAnswer: 'a1' }];
		store.inputs = { q: 'typed' };

		store.openDetail(null);

		expect(store.inputs).toEqual({ q: 'typed' });
	});

	it('openList() sets viewMode back to "list"', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.openDetail(1);
		expect(store.viewMode).toBe('detail');
		store.openList();
		expect(store.viewMode).toBe('list');
	});

	it('setActiveRow(2, 99) sets both activeRowIndex and activeRowId', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.setActiveRow(2, 99);
		expect(store.activeRowIndex).toBe(2);
		expect(store.activeRowId).toBe(99);
	});

	it('setActiveRow(null, null) clears both fields', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.setActiveRow(2, 99);
		store.setActiveRow(null, null);
		expect(store.activeRowIndex).toBeNull();
		expect(store.activeRowId).toBeNull();
	});

	it('reset() restores all new fields to their defaults', () => {
		const store = useEvaluationsWizardSidepanelStore();

		store.openDetail(5);
		store.setActiveRow(5, 42);
		store.datasetInputsByRow.push({ key: 'value' });

		expect(store.viewMode).toBe('detail');
		expect(store.activeRowIndex).toBe(5);
		expect(store.activeRowId).toBe(42);
		expect(store.datasetInputsByRow).toHaveLength(1);

		store.reset();

		expect(store.viewMode).toBe('list');
		expect(store.activeRowIndex).toBeNull();
		expect(store.activeRowId).toBeNull();
		expect(store.datasetInputsByRow).toEqual([]);
	});

	it('open() also resets the new fields (since open calls resetState)', () => {
		const store = useEvaluationsWizardSidepanelStore();

		store.openDetail(3);
		store.setActiveRow(3, 77);
		store.datasetInputsByRow.push({ field: 'v' });

		store.open(0);

		expect(store.viewMode).toBe('list');
		expect(store.activeRowIndex).toBeNull();
		expect(store.activeRowId).toBeNull();
		expect(store.datasetInputsByRow).toEqual([]);
	});

	it('existing behavior: activeStep and isOpen are untouched by the new fields', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.open(2);
		store.openDetail(1);
		// Existing fields are unaffected
		expect(store.activeStep).toBe(2);
		expect(store.isOpen).toBe(true);
	});
});
