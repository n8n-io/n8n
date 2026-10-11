import { LicenseState } from '@n8n/backend-common';
import {
	createWorkflow,
	shareWorkflowWithUsers,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { ExecutionRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { stringify } from 'flatted';
import { createEmptyRunExecutionData, type IRunExecutionData } from 'n8n-workflow';

import { createExecution } from '../shared/db/executions';
import { createMember, createOwner } from '../shared/db/users';

import { ExecutionRedactionServiceProxy } from '@/executions/execution-redaction-proxy.service';
import { createGetExecutionTool } from '@/modules/mcp/tools/get-execution.tool';
import { RedactionModule } from '@/modules/redaction/redaction.module';
import { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

beforeAll(async () => {
	await testModules.loadModules(['mcp', 'redaction']);
	await testDb.init();
	// `loadModules` registers modules but never runs their `init`, which is what
	// hands the real implementation to `ExecutionRedactionServiceProxy`.
	await Container.get(RedactionModule).init();
});

afterAll(async () => {
	await testDb.terminate();
});

const telemetry = mockInstance(Telemetry, { track: vi.fn() });

/**
 * Data redaction is licensed-gated, and `resolvePolicy` returns 'none' without it.
 */
const licenseState = mockInstance(LicenseState, {
	isDataRedactionLicensed: () => true,
});

const SECRET = 'super-secret-value';

const runExecutionData = (): IRunExecutionData => ({
	...createEmptyRunExecutionData(),
	resultData: {
		runData: {
			'HTTP Request': [
				{
					startTime: Date.now(),
					executionIndex: 0,
					executionTime: 1,
					executionStatus: 'success',
					source: [],
					data: { main: [[{ json: { secret: SECRET } }]] },
				},
			],
		},
	},
});

const callTool = async (user: User, workflowId: string, executionId: string) => {
	const tool = createGetExecutionTool(
		user,
		Container.get(ExecutionRepository),
		Container.get(WorkflowFinderService),
		telemetry,
		Container.get(ExecutionRedactionServiceProxy),
	);

	return await tool.handler(
		{
			workflowId,
			executionId,
			includeData: true,
			nodeNames: undefined,
			truncateData: undefined,
		},
		{} as never,
	);
};

const itemOf = (result: Awaited<ReturnType<typeof callTool>>) => {
	const data = (result.structuredContent as { data: IRunExecutionData }).data;
	return data.resultData.runData['HTTP Request'][0].data?.main[0]?.[0];
};

const redactionInfoOf = (result: Awaited<ReturnType<typeof callTool>>) =>
	(result.structuredContent as { data: IRunExecutionData }).data.redactionInfo;

const setup = async ({ redact, owner }: { redact: boolean; owner: User }) => {
	const workflow = await createWorkflow(
		{
			settings: {
				availableInMCP: true,
				...(redact && { redactionPolicy: 'all' as const }),
			},
		},
		owner,
	);

	const execution = await createExecution(
		{ status: 'success', data: stringify(runExecutionData()) },
		workflow,
	);

	return { workflow, execution };
};

describe('get_workflow_execution applies the workflow redaction policy', () => {
	let owner: User;
	let member: User;

	beforeEach(async () => {
		await testDb.truncate(['ExecutionEntity', 'WorkflowEntity', 'SharedWorkflow', 'User']);
		owner = await createOwner();
		member = await createMember();
		expect(licenseState.isDataRedactionLicensed()).toBe(true);
	});

	test('redacts for the owner, who may still reveal', async () => {
		const { workflow, execution } = await setup({ redact: true, owner });

		const result = await callTool(owner, workflow.id, execution.id);

		expect(itemOf(result)?.json).toEqual({});
		expect(redactionInfoOf(result)).toMatchObject({ isRedacted: true, canReveal: true });
	});

	test('redacts for a shared editor, who may not reveal', async () => {
		const { workflow, execution } = await setup({ redact: true, owner });
		await shareWorkflowWithUsers(workflow, [member]);

		const result = await callTool(member, workflow.id, execution.id);

		// The `workflow:editor` sharing role carries no `execution:reveal` scope.
		expect(itemOf(result)?.json).toEqual({});
		expect(redactionInfoOf(result)).toMatchObject({ isRedacted: true, canReveal: false });
	});

	test('leaves data untouched when the workflow has no redaction policy', async () => {
		const { workflow, execution } = await setup({ redact: false, owner });

		const result = await callTool(owner, workflow.id, execution.id);

		expect(itemOf(result)?.json).toEqual({ secret: SECRET });
		expect(redactionInfoOf(result)).toBeUndefined();
	});
});
