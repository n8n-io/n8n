import { createPinia, setActivePinia } from 'pinia';

import { useAiSimulatedExecutionsStore } from '@/app/stores/aiSimulatedExecutions.store';

describe('aiSimulatedExecutions store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('reports a marked node of a marked execution as simulated', () => {
		const store = useAiSimulatedExecutionsStore();
		store.markSimulatedNodes('exec-1', ['Gmail', 'HTTP Request']);

		expect(store.isSimulatedNodeOutput('exec-1', 'Gmail')).toBe(true);
		expect(store.isSimulatedNodeOutput('exec-1', 'HTTP Request')).toBe(true);
	});

	it('reports unmarked nodes and unknown executions as not simulated', () => {
		const store = useAiSimulatedExecutionsStore();
		store.markSimulatedNodes('exec-1', ['Gmail']);

		expect(store.isSimulatedNodeOutput('exec-1', 'Set')).toBe(false);
		expect(store.isSimulatedNodeOutput('exec-2', 'Gmail')).toBe(false);
	});

	it('handles missing execution id or node name', () => {
		const store = useAiSimulatedExecutionsStore();
		store.markSimulatedNodes('exec-1', ['Gmail']);

		expect(store.isSimulatedNodeOutput(undefined, 'Gmail')).toBe(false);
		expect(store.isSimulatedNodeOutput('exec-1', undefined)).toBe(false);
	});

	it('ignores marking with an empty node list', () => {
		const store = useAiSimulatedExecutionsStore();
		store.markSimulatedNodes('exec-1', []);

		expect(store.isSimulatedNodeOutput('exec-1', 'Gmail')).toBe(false);
	});
});
