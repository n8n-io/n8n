import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computed } from 'vue';
import type { IWorkflowGroup } from 'n8n-workflow';

import { useCanvasNodeGroupTelemetry } from './useCanvasNodeGroupTelemetry';

const trackSpy = vi.hoisted(() => vi.fn());

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({ track: trackSpy })),
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: vi.fn(() => computed(() => ({ workflowId: 'wf-test' }))),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({ pushRef: 'push-ref-test' })),
}));

function makeGroup(overrides: Partial<IWorkflowGroup> = {}): IWorkflowGroup {
	return { id: 'group-1', nodeIds: ['a', 'b', 'c'], name: 'My Group', ...overrides };
}

describe('useCanvasNodeGroupTelemetry', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it.each([
		['trackGrouped', 'User grouped nodes'],
		['trackUngrouped', 'User ungrouped nodes'],
		['trackCollapsed', 'User collapsed group'],
		['trackExpanded', 'User expanded group'],
	] as const)('%s fires "%s" with the full property set', (method, eventName) => {
		const telemetry = useCanvasNodeGroupTelemetry();

		telemetry[method](makeGroup(), 'group-toolbar');

		expect(trackSpy).toHaveBeenCalledWith(eventName, {
			workflow_id: 'wf-test',
			group_id: 'group-1',
			node_ids: ['a', 'b', 'c'],
			node_count: 3,
			group_title: 'My Group',
			source: 'group-toolbar',
			push_ref: 'push-ref-test',
		});
	});

	it('passes through the event source', () => {
		const telemetry = useCanvasNodeGroupTelemetry();

		telemetry.trackGrouped(makeGroup(), 'keyboard-shortcut');

		expect(trackSpy).toHaveBeenCalledWith(
			'User grouped nodes',
			expect.objectContaining({ source: 'keyboard-shortcut' }),
		);
	});
});
