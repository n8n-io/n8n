import type { INode, IPinData } from 'n8n-workflow';

import { findRepoRoot } from './environment';
import { executeWorkflowWithPinData } from './workflow-executor';
import type { SimpleWorkflow } from '../../src/types/workflow';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('./environment', () => ({
	findRepoRoot: jest.fn(() => '/mock/repo/root'),
}));

jest.mock('@n8n/di', () => ({
	Container: {
		set: jest.fn(),
		get: jest.fn(() => ({})),
	},
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSimpleWorkflow(nodes?: INode[]): SimpleWorkflow {
	return {
		name: 'Test Workflow',
		nodes: nodes ?? [
			{
				name: 'Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				parameters: {},
				id: 'trigger-1',
			} as INode,
		],
		connections: {},
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('executeWorkflowWithPinData', () => {
	describe('error handling — no monorepo root', () => {
		beforeEach(() => {
			jest.mocked(findRepoRoot).mockReturnValue(undefined);
		});

		it('should return success=false when monorepo root cannot be found', async () => {
			const workflow = makeSimpleWorkflow();
			const pinData: IPinData = {};

			const result = await executeWorkflowWithPinData(workflow, pinData);

			expect(result.success).toBe(false);
			expect(result.error).toContain('Cannot find monorepo root');
			expect(result.executedNodes).toEqual([]);
		});

		it('should always return a non-negative durationMs', async () => {
			const result = await executeWorkflowWithPinData(makeSimpleWorkflow(), {});

			expect(typeof result.durationMs).toBe('number');
			expect(result.durationMs).toBeGreaterThanOrEqual(0);
		});
	});
});

describe('ExecutionResult shape', () => {
	it('should include success, durationMs, and executedNodes', () => {
		const result = {
			success: true,
			durationMs: 100,
			executedNodes: ['Trigger', 'Set'],
		};

		expect(result).toHaveProperty('success');
		expect(result).toHaveProperty('durationMs');
		expect(result).toHaveProperty('executedNodes');
	});

	it('should support optional error and errorNode fields', () => {
		const result = {
			success: false,
			error: 'Something went wrong',
			errorNode: 'HTTP Request',
			durationMs: 50,
			executedNodes: ['Trigger'],
		};

		expect(result.success).toBe(false);
		expect(result.error).toBe('Something went wrong');
		expect(result.errorNode).toBe('HTTP Request');
	});
});
