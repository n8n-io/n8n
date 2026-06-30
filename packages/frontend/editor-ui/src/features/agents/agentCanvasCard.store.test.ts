import { createPinia, setActivePinia } from 'pinia';
import { useAgentCanvasCardStore } from './agentCanvasCard.store';

describe('agentCanvasCard.store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('queues no node by default', () => {
		const store = useAgentCanvasCardStore();
		expect(store.nodeIdToOpenPicker).toBeUndefined();
	});

	it('queues a node id to open its picker', () => {
		const store = useAgentCanvasCardStore();
		store.setNodeIdToOpenPicker('node-1');
		expect(store.nodeIdToOpenPicker).toBe('node-1');
	});

	it('clears the queued node id', () => {
		const store = useAgentCanvasCardStore();
		store.setNodeIdToOpenPicker('node-1');
		store.clearNodeIdToOpenPicker();
		expect(store.nodeIdToOpenPicker).toBeUndefined();
	});
});
