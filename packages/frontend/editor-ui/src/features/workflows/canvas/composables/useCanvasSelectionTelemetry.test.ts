import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computed } from 'vue';

import { useCanvasSelectionTelemetry } from './useCanvasSelectionTelemetry';

const trackSpy = vi.hoisted(() => vi.fn());

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({ track: trackSpy })),
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: vi.fn(() => computed(() => ({ workflowId: 'wf-test' }))),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({ pushRef: 'push-ref-test' })),
}));

describe('useCanvasSelectionTelemetry', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('trackMultipleNodesSelected fires "User selected multiple nodes" with the full property set', () => {
		const telemetry = useCanvasSelectionTelemetry();

		telemetry.trackMultipleNodesSelected(['a', 'b', 'c']);

		expect(trackSpy).toHaveBeenCalledWith('User selected multiple nodes', {
			workflow_id: 'wf-test',
			node_ids: ['a', 'b', 'c'],
			node_count: 3,
			push_ref: 'push-ref-test',
		});
	});
});
