import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shallowReactive, type ComputedRef } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import type { IPinData } from 'n8n-workflow';
import type { CanvasConnectionPort } from '@/features/workflows/canvas/canvas.types';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { useWorkflowDocumentRenderData } from './useWorkflowDocumentRenderData';

const nodeInputsByNodeId = shallowReactive(new Map<string, ComputedRef<CanvasConnectionPort[]>>());
const nodeOutputsByNodeId = shallowReactive(new Map<string, ComputedRef<CanvasConnectionPort[]>>());
const pinnedDataByNodeName = shallowReactive<IPinData>({});
const executionIssuesByNodeName = new Map<string, ComputedRef<string[]>>();

vi.mock('@/app/stores/workflowDocument.store', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/app/stores/workflowDocument.store')>();
	return {
		...actual,
		useWorkflowDocumentStore: vi.fn(() => ({
			workflowId: 'wf-1',
			nodeInputsByNodeId,
			nodeOutputsByNodeId,
			pinnedDataByNodeName,
		})),
	};
});

vi.mock('@/app/stores/workflowExecutionState.store', () => ({
	useWorkflowExecutionStateStore: vi.fn(() => ({
		activeExecutionIssuesByNodeName: executionIssuesByNodeName,
	})),
}));

describe('useWorkflowDocumentRenderData', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.mocked(useWorkflowDocumentStore).mockClear();
		vi.mocked(useWorkflowExecutionStateStore).mockClear();
	});

	it('passes through nodeInputsByNodeId and nodeOutputsByNodeId by reference', () => {
		const renderData = useWorkflowDocumentRenderData(createWorkflowDocumentId('wf-1'));

		expect(renderData.nodeInputsByNodeId).toBe(nodeInputsByNodeId);
		expect(renderData.nodeOutputsByNodeId).toBe(nodeOutputsByNodeId);
	});

	it('passes through pinnedDataByNodeName by reference', () => {
		const renderData = useWorkflowDocumentRenderData(createWorkflowDocumentId('wf-1'));

		expect(renderData.pinnedDataByNodeName).toBe(pinnedDataByNodeName);
	});

	it('exposes executionIssuesByNodeName resolved via the workflow execution state store', () => {
		const renderData = useWorkflowDocumentRenderData(createWorkflowDocumentId('wf-1'));

		expect(renderData.executionIssuesByNodeName).toBe(executionIssuesByNodeName);
	});

	it('uses the exact workflow document id when resolving execution state', () => {
		const documentId = createWorkflowDocumentId('wf-1', 'ver-123');

		useWorkflowDocumentRenderData(documentId);

		expect(useWorkflowExecutionStateStore).toHaveBeenCalledWith(documentId);
	});
});
