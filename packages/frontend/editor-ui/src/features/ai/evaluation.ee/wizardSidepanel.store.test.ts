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

	it('toggleMetric() adds a metric and removes it on second call', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.toggleMetric('correctness');
		expect(store.selectedMetricKeys).toEqual(['correctness']);
		store.toggleMetric('helpfulness');
		expect(store.selectedMetricKeys).toEqual(['correctness', 'helpfulness']);
		store.toggleMetric('correctness');
		expect(store.selectedMetricKeys).toEqual(['helpfulness']);
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
});
