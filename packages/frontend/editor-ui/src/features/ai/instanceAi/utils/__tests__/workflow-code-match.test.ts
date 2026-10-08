import type {
	InstanceAiRunDebugStep,
	InstanceAiRunDebugWorkflowCodeSnapshot,
} from '@n8n/api-types';
import { describe, expect, it } from 'vitest';

import {
	getToolCallIdFromMetadata,
	isWorkflowCodeToolName,
	mapWorkflowSnapshotsByToolCallId,
} from '../workflow-code-match';

function makeSnapshot(
	overrides: Partial<InstanceAiRunDebugWorkflowCodeSnapshot> = {},
): InstanceAiRunDebugWorkflowCodeSnapshot {
	return {
		code: 'workflow code',
		source: 'full-code',
		success: true,
		capturedAt: 1,
		...overrides,
	};
}

describe('workflow-code-match', () => {
	it('identifies the build workflow tool as a workflow code tool', () => {
		expect(isWorkflowCodeToolName('workflow_builder_build_workflow')).toBe(true);
		expect(isWorkflowCodeToolName('build-workflow')).toBe(true);
		expect(isWorkflowCodeToolName('agent_builder_search_nodes')).toBe(false);
	});

	it('reads toolCallId from segment metadata', () => {
		expect(getToolCallIdFromMetadata({ toolCallId: 'tc-1' })).toBe('tc-1');
		expect(getToolCallIdFromMetadata(undefined)).toBeUndefined();
	});

	it('maps snapshots by toolCallId when present', () => {
		const steps: InstanceAiRunDebugStep[] = [
			{
				stepNumber: 0,
				output: {
					toolResults: [
						{
							toolCallId: 'tc-1',
							toolName: 'workflow_builder_build_workflow',
							output: { success: true, workflowId: 'wf-1' },
						},
					],
				},
			},
		];
		const workflowCode = [makeSnapshot({ toolCallId: 'tc-1', workflowId: 'wf-1' })];

		const map = mapWorkflowSnapshotsByToolCallId(steps, workflowCode);

		expect(map.get('tc-1')).toEqual(workflowCode[0]);
	});

	it('falls back to sequential matching when snapshots lack toolCallId', () => {
		const steps: InstanceAiRunDebugStep[] = [
			{
				stepNumber: 0,
				output: {
					toolResults: [
						{
							toolCallId: 'tc-1',
							toolName: 'workflow_builder_build_workflow',
							output: { success: true, workflowId: 'wf-1' },
						},
					],
				},
			},
			{
				stepNumber: 1,
				output: {
					toolResults: [
						{
							toolCallId: 'tc-2',
							toolName: 'workflow_builder_build_workflow',
							output: { success: false },
						},
					],
				},
			},
		];
		const workflowCode = [
			makeSnapshot({ workflowId: 'wf-1', code: 'first' }),
			makeSnapshot({ success: false, code: 'second' }),
		];

		const map = mapWorkflowSnapshotsByToolCallId(steps, workflowCode);

		expect(map.get('tc-1')?.code).toBe('first');
		expect(map.get('tc-2')?.code).toBe('second');
	});
});
