/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import WorkflowExecutionLogViewer from '../components/WorkflowExecutionLogViewer.vue';

const fetchExecution = vi.fn();

vi.mock('@/features/execution/executions/executions.store', () => ({
	useExecutionsStore: () => ({ fetchExecution }),
}));

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({
		workflowExecutionData: null,
		getNodeTypes: () => ({
			getByName: () => undefined,
			getByNameAndVersion: () => undefined,
			getKnownTypes: () => ({}),
		}),
	}),
}));

vi.mock('@/app/composables/useWorkflowState', () => ({
	useWorkflowState: () => ({
		setWorkflowExecutionData: vi.fn(),
	}),
}));

vi.mock('@/app/composables/useWorkflowHelpers', () => ({
	useWorkflowHelpers: () => ({
		getNodeTypes: () => ({
			getByName: () => undefined,
			getByNameAndVersion: () => undefined,
			getKnownTypes: () => ({}),
		}),
	}),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: () => null,
		loadNodeTypesIfNotLoaded: vi.fn().mockResolvedValue(undefined),
	}),
}));

vi.mock('@/features/execution/logs/components/LogsOverviewRow.vue', () => ({
	default: {
		props: ['data', 'isSelected'],
		emits: ['toggleSelected', 'toggleExpanded'],
		template:
			'<div data-test-id="log-node-row" @click="$emit(\'toggleSelected\')">{{ data?.node?.name }}</div>',
	},
}));

vi.mock('@/features/ndv/runData/components/RunData.vue', () => ({
	default: {
		props: ['node', 'runIndex', 'paneType', 'displayMode'],
		template: '<div data-test-id="run-data" :data-pane-type="paneType" />',
	},
}));

vi.mock('@/features/ndv/runData/components/error/NodeErrorView.vue', () => ({
	default: {
		props: ['error', 'compact', 'showDetails'],
		template: '<div data-test-id="node-error-view" />',
	},
}));

function makeRouter(): Router {
	return createRouter({
		history: createMemoryHistory(),
		routes: [
			{
				path: '/workflow/:name/executions/:executionId',
				name: 'ExecutionPreview',
				component: { template: '<div/>' },
			},
		],
	});
}

function mountIt(props: { workflowId: string; workflowExecutionId: string }) {
	return mount(WorkflowExecutionLogViewer, {
		props,
		global: { plugins: [makeRouter()] },
	});
}

beforeEach(() => {
	fetchExecution.mockReset();
});

describe('WorkflowExecutionLogViewer', () => {
	it('shows "Still running" banner when status is running', async () => {
		fetchExecution.mockResolvedValueOnce({
			id: 'exec-1',
			status: 'running',
			data: { resultData: { runData: {} } },
		});
		const w = mountIt({ workflowId: 'wf-1', workflowExecutionId: 'exec-1' });
		await flushPromises();
		expect(w.text()).toContain('Still running');
	});

	it('shows "Waiting" banner when status is waiting', async () => {
		fetchExecution.mockResolvedValueOnce({
			id: 'exec-1',
			status: 'waiting',
			data: { resultData: { runData: {} } },
		});
		const w = mountIt({ workflowId: 'wf-1', workflowExecutionId: 'exec-1' });
		await flushPromises();
		expect(w.text()).toContain('Waiting');
	});

	it('shows error banner when fetchExecution rejects', async () => {
		fetchExecution.mockRejectedValueOnce(new Error('not found'));
		const w = mountIt({ workflowId: 'wf-1', workflowExecutionId: 'bad' });
		await flushPromises();
		expect(w.text()).toContain('unavailable');
	});

	it('shows error banner when fetchExecution returns undefined', async () => {
		fetchExecution.mockResolvedValueOnce(undefined);
		const w = mountIt({ workflowId: 'wf-1', workflowExecutionId: 'bad' });
		await flushPromises();
		expect(w.text()).toContain('unavailable');
	});

	it('calls fetchExecution with the executionId on mount', async () => {
		fetchExecution.mockResolvedValueOnce({
			id: 'exec-1',
			status: 'success',
			data: { resultData: { runData: {} } },
		});
		mountIt({ workflowId: 'wf-1', workflowExecutionId: 'exec-1' });
		await flushPromises();
		expect(fetchExecution).toHaveBeenCalledWith('exec-1');
	});
});
