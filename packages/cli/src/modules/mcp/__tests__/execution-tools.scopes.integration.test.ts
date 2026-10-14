import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import { ExecutionRepository } from '@n8n/db';
import type { User, WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { ExecutionListService } from '@/executions/execution-list.service';
import { ExecutionRedactionServiceProxy } from '@/executions/execution-redaction-proxy.service';
import type { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { createSuccessfulExecution } from '@test-integration/db/executions';
import { createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
import { createMember, createOwner } from '@test-integration/db/users';

import { createGetExecutionTool } from '../tools/get-execution.tool';
import { createSearchExecutionsTool } from '../tools/search-executions.tool';

let workflow: WorkflowEntity;
let executionId: string;
let workflowReader: User;
let executionReader: User;

beforeAll(async () => {
	await testDb.init();

	const owner = await createOwner();
	const project = await createTeamProject('MCP execution scopes', owner);
	workflow = await createWorkflow({ settings: { availableInMCP: true } }, project);
	executionId = (await createSuccessfulExecution(workflow)).id;

	const workflowOnlyRole = await createCustomRoleWithScopeSlugs(['workflow:read'], {
		roleType: 'project',
	});
	workflowReader = await createMember();
	await linkUserToProject(workflowReader, project, workflowOnlyRole.slug);

	executionReader = await createMember();
	await linkUserToProject(executionReader, project, 'project:viewer');
});

afterAll(async () => {
	await testDb.terminate();
});

const getExecution = async (user: User, includeData: boolean) =>
	await createGetExecutionTool(
		user,
		Container.get(ExecutionRepository),
		Container.get(WorkflowFinderService),
		mock<Telemetry>(),
		Container.get(ExecutionRedactionServiceProxy),
	).handler(
		{
			workflowId: workflow.id,
			executionId,
			includeData,
			nodeNames: undefined,
			truncateData: undefined,
		},
		{} as never,
	);

const searchExecutions = async (user: User, workflowId?: string) =>
	await createSearchExecutionsTool(
		user,
		Container.get(ExecutionListService),
		Container.get(WorkflowFinderService),
		mock<Telemetry>(),
	).handler({ workflowId }, {} as never);

describe('get_workflow_execution project role scopes', () => {
	test.each([true, false])(
		'returns no execution for a role without execution:read (includeData: %s)',
		async (includeData) => {
			const result = await getExecution(workflowReader, includeData);

			expect(result.structuredContent).toMatchObject({
				execution: null,
				error: "Workflow not found or you don't have permission to access it.",
			});
			expect(result.structuredContent).not.toHaveProperty('data');
		},
	);

	test('returns the execution for a role with execution:read', async () => {
		const result = await getExecution(executionReader, false);

		expect(result.structuredContent).toMatchObject({
			execution: { id: executionId, workflowId: workflow.id },
		});
	});
});

describe('search_workflow_executions project role scopes', () => {
	test('returns an access error for a role without execution:read when filtering by workflow', async () => {
		const result = await searchExecutions(workflowReader, workflow.id);

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toMatchObject({
			data: [],
			error: "Workflow not found or you don't have permission to access it.",
		});
	});

	test('returns no executions for a role without execution:read', async () => {
		const result = await searchExecutions(workflowReader);

		expect(result.structuredContent).toMatchObject({ data: [], count: 0 });
		expect(result.structuredContent).not.toHaveProperty('error');
	});

	test.each([undefined, 'workflow'] as const)(
		'returns the execution for a role with execution:read (filter: %s)',
		async (filter) => {
			const result = await searchExecutions(executionReader, filter ? workflow.id : undefined);

			expect(result.structuredContent).toMatchObject({
				data: [expect.objectContaining({ id: executionId, workflowId: workflow.id })],
			});
		},
	);
});
