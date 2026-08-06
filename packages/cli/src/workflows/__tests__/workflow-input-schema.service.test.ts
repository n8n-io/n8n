import type { INode, IWorkflowBase } from 'n8n-workflow';
import {
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ExecuteWorkflowTrigger } from 'n8n-nodes-base/dist/nodes/ExecuteWorkflow/ExecuteWorkflowTrigger/ExecuteWorkflowTrigger.node';

import type { NodeTypes } from '@/node-types';
import { WorkflowInputSchemaService } from '@/workflows/workflow-input-schema.service';

vi.mock('@/workflow-execute-additional-data', () => ({
	getBase: vi.fn(async () => ({})),
}));

// Plain objects rather than mocks: the context deep-copies the node, which a
// mock proxy does not survive.
const node = (
	type: string,
	parameters: INode['parameters'] = {},
	{ disabled = false, typeVersion = 1.2 } = {},
): INode => ({
	id: `${type}-id`,
	name: type,
	type,
	typeVersion,
	position: [0, 0],
	parameters,
	disabled,
});

const workflow = (nodes: INode[]): IWorkflowBase =>
	({
		id: 'workflow-1',
		name: 'Report',
		nodes,
		connections: {},
		active: false,
		settings: {},
	}) as IWorkflowBase;

describe('WorkflowInputSchemaService', () => {
	let service: WorkflowInputSchemaService;

	beforeEach(() => {
		// The real trigger type: parameter resolution reads its description, so a
		// bare mock would not exercise the declared defaults or display conditions.
		const nodeTypes = mock<NodeTypes>();
		nodeTypes.getByNameAndVersion.mockReturnValue(new ExecuteWorkflowTrigger());

		service = new WorkflowInputSchemaService(nodeTypes);
	});

	describe('eligibility', () => {
		it('should reject a workflow with nothing to start from', async () => {
			const result = await service.describe(workflow([node('n8n-nodes-base.set')]));

			expect(result).toEqual({ eligible: false, reason: 'no-start-node' });
		});

		it('should reject a workflow that carries its own schedule', async () => {
			// It would run globally on its own schedule as well as per subscription.
			const result = await service.describe(
				workflow([
					node(SCHEDULE_TRIGGER_NODE_TYPE),
					node(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, { inputSource: 'workflowInputs' }),
				]),
			);

			expect(result).toEqual({ eligible: false, reason: 'own-schedule' });
		});

		it('should ignore a disabled schedule trigger', async () => {
			const result = await service.describe(
				workflow([
					node(SCHEDULE_TRIGGER_NODE_TYPE, {}, { disabled: true }),
					node(MANUAL_TRIGGER_NODE_TYPE),
				]),
			);

			expect(result).toEqual({ eligible: true, trigger: 'manual-trigger', fields: [] });
		});

		it('should accept a manual trigger as taking no input', async () => {
			const result = await service.describe(workflow([node(MANUAL_TRIGGER_NODE_TYPE)]));

			expect(result).toEqual({ eligible: true, trigger: 'manual-trigger', fields: [] });
		});

		it('should accept a trigger that takes all data as one taking none', async () => {
			// No fields to render, which is the same position as a declared contract
			// with nothing in it — and that one is offered.
			const result = await service.describe(
				workflow([node(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, { inputSource: 'passthrough' })]),
			);

			expect(result).toEqual({
				eligible: true,
				trigger: 'execute-workflow-trigger',
				fields: [],
			});
		});

		it('should accept a pre-1.1 trigger, which has no mode to set', async () => {
			// It reads as passthrough because the parameter does not exist below 1.1,
			// so it lands in the same place: a trigger declaring no fields.
			const result = await service.describe(
				workflow([
					node(
						EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
						{ inputSource: 'workflowInputs' },
						{ typeVersion: 1 },
					),
				]),
			);

			expect(result).toEqual({
				eligible: true,
				trigger: 'execute-workflow-trigger',
				fields: [],
			});
		});
	});

	describe('declared fields', () => {
		it('should read fields defined through the UI', async () => {
			const result = await service.describe(
				workflow([
					node(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, {
						inputSource: 'workflowInputs',
						workflowInputs: {
							values: [
								{ name: 'customer', type: 'string' },
								{ name: 'amount', type: 'number' },
							],
						},
					}),
				]),
			);

			expect(result).toEqual({
				eligible: true,
				trigger: 'execute-workflow-trigger',
				fields: [
					{ name: 'customer', type: 'string' },
					{ name: 'amount', type: 'number' },
				],
			});
		});

		it('should derive fields from a JSON example', async () => {
			const result = await service.describe(
				workflow([
					node(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, {
						inputSource: 'jsonExample',
						jsonExample: JSON.stringify({ customer: 'Acme Corp', amount: 42 }),
					}),
				]),
			);

			expect(result).toEqual({
				eligible: true,
				trigger: 'execute-workflow-trigger',
				fields: [
					{ name: 'customer', type: 'string' },
					{ name: 'amount', type: 'number' },
				],
			});
		});

		it('should accept a trigger that declares no fields yet', async () => {
			const result = await service.describe(
				workflow([node(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, { inputSource: 'workflowInputs' })]),
			);

			expect(result).toEqual({ eligible: true, trigger: 'execute-workflow-trigger', fields: [] });
		});

		it('should prefer the declared contract over a manual trigger', async () => {
			const result = await service.describe(
				workflow([
					node(MANUAL_TRIGGER_NODE_TYPE),
					node(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, {
						inputSource: 'workflowInputs',
						workflowInputs: { values: [{ name: 'customer', type: 'string' }] },
					}),
				]),
			);

			expect(result).toEqual({
				eligible: true,
				trigger: 'execute-workflow-trigger',
				fields: [{ name: 'customer', type: 'string' }],
			});
		});
	});
});
