import { setActivePinia, createPinia } from 'pinia';
import { describe, beforeEach, expect, it, vi } from 'vitest';
import { createRunExecutionData } from 'n8n-workflow';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import {
	createExecutionDataId,
	disposeExecutionDataStore,
	useExecutionDataStore,
} from './executionData.store';

function createExecution(id: string, nodeName = 'Start'): IExecutionResponse {
	return {
		id,
		finished: false,
		mode: 'manual',
		status: 'running',
		createdAt: new Date(),
		startedAt: new Date(),
		workflowId: 'workflow-1',
		executedNode: nodeName,
		workflowData: {
			id: 'workflow-1',
			name: 'Workflow',
			active: false,
			isArchived: false,
			createdAt: new Date(),
			updatedAt: new Date(),
			nodes: [
				{
					id: 'node-1',
					name: nodeName,
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
			settings: {},
		},
		data: createRunExecutionData({
			resultData: {
				runData: {
					[nodeName]: [
						{
							startTime: 1,
							executionIndex: 0,
							executionTime: 1,
							executionStatus: 'success',
							source: [],
							data: { main: [[{ json: { value: 1 } }]] },
						},
					],
				},
				pinData: {},
			},
		}),
	};
}

describe('useExecutionDataStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
	});

	it('isolates store instances by execution id', () => {
		const first = useExecutionDataStore(createExecutionDataId('exec-1'));
		const second = useExecutionDataStore(createExecutionDataId('exec-2'));

		first.setExecution(createExecution('exec-1'));

		expect(first.execution?.id).toBe('exec-1');
		expect(second.execution).toBeNull();
	});

	it('sets execution data and derives run data, executed node, mappings, and timestamp', () => {
		const store = useExecutionDataStore(createExecutionDataId('exec-1'));

		store.setExecution(createExecution('exec-1', 'Start'));

		expect(store.executionRunData?.Start).toHaveLength(1);
		expect(store.executedNode).toBe('Start');
		expect(store.executionPairedItemMappings).toEqual({});
		expect(store.executionResultDataLastUpdate).toBe(Date.now());
	});

	it('updates node execution data and preserves redaction info', () => {
		const store = useExecutionDataStore(createExecutionDataId('exec-1'));
		store.setExecution(createExecution('exec-1', 'Start'));

		store.updateNodeExecutionStatus({
			nodeName: 'Start',
			data: {
				startTime: 2,
				executionIndex: 1,
				executionTime: 1,
				executionStatus: 'success',
				source: [],
				data: { main: [[{ json: {}, redaction: { redacted: true, reason: 'policy' } }]] },
			},
		});

		expect(store.executionRunData?.Start).toHaveLength(2);
		expect(store.execution?.data?.redactionInfo).toEqual({
			isRedacted: true,
			reason: 'policy',
			canReveal: false,
		});
	});

	it('clears, renames, resets, and disposes only targeted execution data', () => {
		const first = useExecutionDataStore(createExecutionDataId('exec-1'));
		const second = useExecutionDataStore(createExecutionDataId('exec-2'));
		first.setExecution(createExecution('exec-1', 'Old'));
		second.setExecution(createExecution('exec-2', 'Other'));

		first.renameExecutionDataNode('Old', 'New');
		expect(first.executionRunData?.Old).toBeUndefined();
		expect(first.executionRunData?.New).toBeDefined();

		first.clearNodeExecutionData('New');
		expect(first.executionRunData?.New).toBeUndefined();

		first.resetExecutionData();
		expect(first.execution).toBeNull();
		expect(second.execution?.id).toBe('exec-2');

		disposeExecutionDataStore(createExecutionDataId('exec-2'));
		expect(useExecutionDataStore(createExecutionDataId('exec-2')).execution).toBeNull();
	});
});
