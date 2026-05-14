import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computed, shallowReactive, type ComputedRef } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { CanvasConnectionPort } from '@/features/workflows/canvas/canvas.types';
import { useWorkflowDocumentRenderData } from './useWorkflowDocumentRenderData';
import type { WorkflowDocumentId } from '../workflowDocument.store';

const mockInputsMap = shallowReactive(new Map<string, ComputedRef<CanvasConnectionPort[]>>());
const mockOutputsMap = shallowReactive(new Map<string, ComputedRef<CanvasConnectionPort[]>>());

vi.mock('@/app/stores/workflowDocument.store', () => ({
	useWorkflowDocumentStore: vi.fn(() => ({
		nodeInputsByNodeId: mockInputsMap,
		nodeOutputsByNodeId: mockOutputsMap,
	})),
}));

describe('useWorkflowDocumentRenderData', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		mockInputsMap.clear();
		mockOutputsMap.clear();
	});

	it('should expose nodeInputsByNodeId from the store', () => {
		const inputs = computed<CanvasConnectionPort[]>(() => [
			{ type: NodeConnectionTypes.Main, index: 0 },
		]);
		mockInputsMap.set('node-1', inputs);

		const { nodeInputsByNodeId } = useWorkflowDocumentRenderData(
			'test@latest' as WorkflowDocumentId,
		);

		expect(nodeInputsByNodeId.get('node-1')).toBe(inputs);
	});

	it('should expose nodeOutputsByNodeId from the store', () => {
		const outputs = computed<CanvasConnectionPort[]>(() => [
			{ type: NodeConnectionTypes.Main, index: 0 },
		]);
		mockOutputsMap.set('node-1', outputs);

		const { nodeOutputsByNodeId } = useWorkflowDocumentRenderData(
			'test@latest' as WorkflowDocumentId,
		);

		expect(nodeOutputsByNodeId.get('node-1')).toBe(outputs);
	});

	it('should return empty maps when store has no port data', () => {
		const { nodeInputsByNodeId, nodeOutputsByNodeId } = useWorkflowDocumentRenderData(
			'test@latest' as WorkflowDocumentId,
		);

		expect(nodeInputsByNodeId.size).toBe(0);
		expect(nodeOutputsByNodeId.size).toBe(0);
	});
});
