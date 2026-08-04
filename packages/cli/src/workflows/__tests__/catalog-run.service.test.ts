import type { User } from '@n8n/db';
import type { INode, IWorkflowBase } from 'n8n-workflow';
import {
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	UserError,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ExecutionMetadataService } from '@/services/execution-metadata.service';
import { CATALOG_RUN_USER_KEY, CatalogRunService } from '@/workflows/catalog-run.service';
import type { WorkflowExecutionService } from '@/workflows/workflow-execution.service';
import type { WorkflowInputSchemaService } from '@/workflows/workflow-input-schema.service';

vi.mock('@/workflow-execute-additional-data', () => ({
	getBase: vi.fn(async () => ({ userId: 'user-1' })),
}));

const node = (type: string, disabled = false): INode =>
	({
		id: `${type}-id`,
		name: type,
		type,
		typeVersion: 1.2,
		position: [0, 0],
		parameters: {},
		disabled,
	}) as INode;

const workflow = (nodes: INode[]): IWorkflowBase =>
	({
		id: 'workflow-1',
		name: 'Report',
		nodes,
		connections: {},
		active: false,
		settings: {},
	}) as IWorkflowBase;

describe('CatalogRunService', () => {
	const user = mock<User>({ id: 'user-1' });

	let service: CatalogRunService;
	let executions: ReturnType<typeof mock<WorkflowExecutionService>>;
	let schemas: ReturnType<typeof mock<WorkflowInputSchemaService>>;
	let metadata: ReturnType<typeof mock<ExecutionMetadataService>>;

	beforeEach(() => {
		executions = mock<WorkflowExecutionService>();
		schemas = mock<WorkflowInputSchemaService>();
		metadata = mock<ExecutionMetadataService>();

		executions.runWorkflow.mockResolvedValue('execution-1');
		schemas.describe.mockResolvedValue({
			eligible: true,
			fields: [{ name: 'customer', type: 'string' }],
		});

		service = new CatalogRunService(executions, schemas, metadata);
	});

	it('should start from the trigger that declares the contract', async () => {
		const wf = workflow([node(MANUAL_TRIGGER_NODE_TYPE), node(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE)]);

		await service.run(wf, user, { customer: 'Acme Corp' });

		const [, startNode] = executions.runWorkflow.mock.calls[0];
		expect(startNode.type).toBe(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE);
	});

	it('should run in production mode, not manual', async () => {
		// A manual run would honour "don't save manual executions" and apply the
		// builder's pinned data, both of which break the run history people see.
		await service.run(workflow([node(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE)]), user);

		const [, , , , mode] = executions.runWorkflow.mock.calls[0];
		expect(mode).toBe('trigger');
	});

	it('should pass declared inputs through as the first item', async () => {
		await service.run(workflow([node(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE)]), user, {
			customer: 'Acme Corp',
		});

		const [, , data] = executions.runWorkflow.mock.calls[0];
		expect(data).toEqual([[{ json: { customer: 'Acme Corp' } }]]);
	});

	it('should drop values the contract does not declare', async () => {
		await service.run(workflow([node(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE)]), user, {
			customer: 'Acme Corp',
			smuggled: 'value',
		});

		const [, , data] = executions.runWorkflow.mock.calls[0];
		expect(data).toEqual([[{ json: { customer: 'Acme Corp' } }]]);
	});

	it('should tag the execution with the person who ran it', async () => {
		const result = await service.run(workflow([node(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE)]), user);

		expect(result).toEqual({ executionId: 'execution-1' });
		expect(metadata.save).toHaveBeenCalledWith('execution-1', {
			[CATALOG_RUN_USER_KEY]: 'user-1',
		});
	});

	it('should refuse a workflow the catalog does not offer', async () => {
		schemas.describe.mockResolvedValue({ eligible: false, reason: 'own-schedule' });

		await expect(
			service.run(workflow([node(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE)]), user),
		).rejects.toThrow(UserError);

		expect(executions.runWorkflow).not.toHaveBeenCalled();
	});

	it('should ignore a disabled trigger when choosing the start node', async () => {
		const wf = workflow([
			node(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, true),
			node(MANUAL_TRIGGER_NODE_TYPE),
		]);

		await service.run(wf, user);

		const [, startNode] = executions.runWorkflow.mock.calls[0];
		expect(startNode.type).toBe(MANUAL_TRIGGER_NODE_TYPE);
	});
});
