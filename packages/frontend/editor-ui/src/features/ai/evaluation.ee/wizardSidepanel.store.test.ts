import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useEvaluationsWizardSidepanelStore } from './wizardSidepanel.store';

describe('wizardSidepanel.store', () => {
	beforeEach(() => {
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

	it('opens and closes the custom scorer modal', () => {
		const store = useEvaluationsWizardSidepanelStore();
		expect(store.isCustomScorerModalOpen).toBe(false);
		store.openCustomScorerModal();
		expect(store.isCustomScorerModalOpen).toBe(true);
		store.closeCustomScorerModal();
		expect(store.isCustomScorerModalOpen).toBe(false);
	});

	it('adds an expression custom scorer with a generated id', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.addCustomScorer({
			name: 'Length',
			expression: '{{ $json.output.length > 0 }}',
		});
		expect(store.customScorers).toHaveLength(1);
		expect(store.customScorers[0]).toMatchObject({ name: 'Length' });
		expect(store.customScorers[0].id).toEqual(expect.any(String));
	});

	it('removes a custom scorer by id', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.addCustomScorer({ name: 'A', expression: '1' });
		store.addCustomScorer({ name: 'B', expression: '2' });
		const idToRemove = store.customScorers[0].id;
		store.removeCustomScorer(idToRemove);
		expect(store.customScorers).toHaveLength(1);
		expect(store.customScorers[0].name).toBe('B');
	});

	it('resets custom scorers and modal state when the wizard reopens', () => {
		const store = useEvaluationsWizardSidepanelStore();
		store.addCustomScorer({ name: 'A', expression: '1' });
		store.openCustomScorerModal();
		store.open(0);
		expect(store.customScorers).toEqual([]);
		expect(store.isCustomScorerModalOpen).toBe(false);
	});
});
