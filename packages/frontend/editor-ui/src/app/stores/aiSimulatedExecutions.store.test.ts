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

	it('evicts the oldest executions beyond the retention bound', () => {
		const store = useAiSimulatedExecutionsStore();
		for (let i = 0; i < 30; i++) {
			store.markSimulatedNodes(`exec-${i}`, ['Gmail']);
		}

		expect(store.isSimulatedNodeOutput('exec-0', 'Gmail')).toBe(false);
		expect(store.isSimulatedNodeOutput('exec-4', 'Gmail')).toBe(false);
		expect(store.isSimulatedNodeOutput('exec-5', 'Gmail')).toBe(true);
		expect(store.isSimulatedNodeOutput('exec-29', 'Gmail')).toBe(true);
	});

	it('keeps a re-marked execution alive past eviction', () => {
		const store = useAiSimulatedExecutionsStore();
		store.markSimulatedNodes('exec-keep', ['Gmail']);
		for (let i = 0; i < 24; i++) {
			store.markSimulatedNodes(`exec-${i}`, ['Gmail']);
		}
		store.markSimulatedNodes('exec-keep', ['Gmail']);
		store.markSimulatedNodes('exec-new', ['Gmail']);

		expect(store.isSimulatedNodeOutput('exec-keep', 'Gmail')).toBe(true);
		expect(store.isSimulatedNodeOutput('exec-0', 'Gmail')).toBe(false);
	});
});
