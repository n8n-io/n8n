import { createPinia, setActivePinia } from 'pinia';
import { useAgentReturnContextStore } from '../agentReturnContext.store';

describe('agentReturnContext.store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('defaults to no context', () => {
		expect(useAgentReturnContextStore().context).toBeNull();
	});

	it('sets and clears the context', () => {
		const store = useAgentReturnContextStore();

		store.set({ workflowId: 'wf-1', nodeId: 'abc123' });
		expect(store.context).toEqual({ workflowId: 'wf-1', nodeId: 'abc123' });

		store.clear();
		expect(store.context).toBeNull();
	});
});
