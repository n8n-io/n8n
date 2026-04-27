import { createPinia, setActivePinia } from 'pinia';
import { jsonParse } from 'n8n-workflow';
import { useEvalModeStore } from './evalMode.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { LOCAL_STORAGE_EVAL_MODE_BY_WORKFLOW } from '@/app/constants';

describe('evalMode.store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		localStorage.clear();
	});

	function givenWorkflowId(id: string) {
		const workflows = useWorkflowsStore();
		workflows.setWorkflowId(id);
	}

	it('dims eval-type nodes when eval mode is off', () => {
		givenWorkflowId('abc');
		const store = useEvalModeStore();
		expect(store.isEvalMode).toBe(false);
		expect(store.shouldDim('n8n-nodes-base.evaluation')).toBe(true);
		expect(store.shouldDim('n8n-nodes-base.evaluationTrigger')).toBe(true);
	});

	it('does not dim non-eval nodes', () => {
		givenWorkflowId('abc');
		const store = useEvalModeStore();
		expect(store.shouldDim('n8n-nodes-base.httpRequest')).toBe(false);
		expect(store.shouldDim(undefined)).toBe(false);
	});

	it('stops dimming once eval mode is toggled on', () => {
		givenWorkflowId('abc');
		const store = useEvalModeStore();
		store.toggle();
		expect(store.isEvalMode).toBe(true);
		expect(store.shouldDim('n8n-nodes-base.evaluation')).toBe(false);
	});

	it('persists per workflow id in localStorage', () => {
		givenWorkflowId('workflow-one');
		const store = useEvalModeStore();
		store.toggle();
		expect(store.isEvalMode).toBe(true);
		const raw = localStorage.getItem(LOCAL_STORAGE_EVAL_MODE_BY_WORKFLOW);
		expect(jsonParse<Record<string, boolean>>(raw ?? '{}')).toEqual({ 'workflow-one': true });
	});

	it('routes every unsaved workflow through the "new" sentinel key', () => {
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
