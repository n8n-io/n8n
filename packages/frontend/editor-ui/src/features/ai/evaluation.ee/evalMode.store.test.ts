import { createPinia, setActivePinia } from 'pinia';
import { jsonParse } from 'n8n-workflow';
import { useEvalModeStore } from './evalMode.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { EVAL_MODE_EXPERIMENT, LOCAL_STORAGE_EVAL_MODE_BY_WORKFLOW } from '@/app/constants';
import { mockedStore } from '@/__tests__/utils';

describe('evalMode.store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		localStorage.clear();
	});

	function givenFlagEnabled(enabled: boolean) {
		const postHog = mockedStore(usePostHog);
		postHog.getVariant = vi.fn((experiment: string | number) =>
			experiment === EVAL_MODE_EXPERIMENT.name && enabled
				? EVAL_MODE_EXPERIMENT.variant
				: undefined,
		);
	}

	function givenWorkflowId(id: string) {
		const workflows = useWorkflowsStore();
		workflows.setWorkflowId(id);
	}

	it('reports the feature disabled when PostHog does not return the variant', () => {
		givenFlagEnabled(false);
		givenWorkflowId('abc');
		const store = useEvalModeStore();
		expect(store.isFeatureEnabled).toBe(false);
	});

	it('reports the feature enabled when PostHog returns the variant', () => {
		givenFlagEnabled(true);
		givenWorkflowId('abc');
		const store = useEvalModeStore();
		expect(store.isFeatureEnabled).toBe(true);
	});

	it('does not dim anything when the flag is off, even for eval-type nodes', () => {
		givenFlagEnabled(false);
		givenWorkflowId('abc');
		const store = useEvalModeStore();
		expect(store.shouldDim('n8n-nodes-base.evaluation')).toBe(false);
		expect(store.shouldDim('n8n-nodes-base.evaluationTrigger')).toBe(false);
	});

	it('dims eval-type nodes when the flag is on and eval mode is off', () => {
		givenFlagEnabled(true);
		givenWorkflowId('abc');
		const store = useEvalModeStore();
		expect(store.isEvalMode).toBe(false);
		expect(store.shouldDim('n8n-nodes-base.evaluation')).toBe(true);
		expect(store.shouldDim('n8n-nodes-base.evaluationTrigger')).toBe(true);
	});

	it('does not dim non-eval nodes', () => {
		givenFlagEnabled(true);
		givenWorkflowId('abc');
		const store = useEvalModeStore();
		expect(store.shouldDim('n8n-nodes-base.httpRequest')).toBe(false);
		expect(store.shouldDim(undefined)).toBe(false);
	});

	it('stops dimming once eval mode is toggled on', () => {
		givenFlagEnabled(true);
		givenWorkflowId('abc');
		const store = useEvalModeStore();
		store.toggle();
		expect(store.isEvalMode).toBe(true);
		expect(store.shouldDim('n8n-nodes-base.evaluation')).toBe(false);
	});

	it('persists per workflow id in localStorage', () => {
		givenFlagEnabled(true);
		givenWorkflowId('workflow-one');
		const store = useEvalModeStore();
		store.toggle();
		expect(store.isEvalMode).toBe(true);
		const raw = localStorage.getItem(LOCAL_STORAGE_EVAL_MODE_BY_WORKFLOW);
		expect(jsonParse<Record<string, boolean>>(raw ?? '{}')).toEqual({ 'workflow-one': true });
	});

	it('routes every unsaved workflow through the "new" sentinel key', () => {
		givenFlagEnabled(true);
		givenWorkflowId('');
		const store = useEvalModeStore();
		store.toggle();
		const raw = jsonParse<Record<string, boolean>>(
			localStorage.getItem(LOCAL_STORAGE_EVAL_MODE_BY_WORKFLOW) ?? '{}',
		);
		expect(raw).toEqual({ new: true });
		expect(raw['']).toBeUndefined();
	});

	it('does not inherit the "new" sentinel state after a workflow is saved', () => {
		givenFlagEnabled(true);
		givenWorkflowId('');
		const store = useEvalModeStore();
		store.toggle();
		expect(store.isEvalMode).toBe(true);

		// Workflow gets saved and receives a real id.
		const workflows = useWorkflowsStore();
		workflows.setWorkflowId('real-id');
		expect(store.isEvalMode).toBe(false);
	});

	it('keeps independent state per saved workflow id', () => {
		givenFlagEnabled(true);
		const workflows = useWorkflowsStore();
		workflows.setWorkflowId('one');
		const store = useEvalModeStore();
		store.toggle();
		expect(store.isEvalMode).toBe(true);

		workflows.setWorkflowId('two');
		expect(store.isEvalMode).toBe(false);

		workflows.setWorkflowId('one');
		expect(store.isEvalMode).toBe(true);
	});
});
