import type { ResolvedDependency } from '@n8n/api-types';
import type { User, WorkflowEntity } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { WorkflowDependencyQueryService } from '@/modules/workflow-index/workflow-dependency-query.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import {
	createGetDependenciesTool,
	type GetDependenciesToolOptions,
} from '../tools/get-dependencies.tool';

const user = mock<User>({ id: 'user-1' });

const ALL_GRANTED: GetDependenciesToolOptions = {
	credentialGranted: true,
	dataTableGranted: true,
	agentGranted: true,
	workflowWriteAvailable: true,
};

const workflowEntity = (attributes: Partial<WorkflowEntity>) =>
	mock<WorkflowEntity>({ isArchived: false, settings: { availableInMCP: true }, ...attributes });

function harness(options: Partial<GetDependenciesToolOptions> = {}) {
	const dependencies = mock<WorkflowDependencyQueryService>();
	const workflowFinder = mock<WorkflowFinderService>();
	const telemetry = mock<Telemetry>();

	workflowFinder.findWorkflowForUser.mockResolvedValue(workflowEntity({ id: 'wf-1' }));
	workflowFinder.findWorkflowsByIdsForUser.mockResolvedValue([]);
	dependencies.canReadResource.mockResolvedValue(true);
	dependencies.getResourceDependencies.mockResolvedValue({});
	dependencies.getDependencyListGaps.mockResolvedValue([]);

	const tool = createGetDependenciesTool(user, dependencies, workflowFinder, telemetry, {
		...ALL_GRANTED,
		...options,
	});

	const resolve = (items: ResolvedDependency[], inaccessibleCount = 0, id = 'wf-1') =>
		dependencies.getResourceDependencies.mockResolvedValue({
			[id]: { dependencies: items, inaccessibleCount },
		});

	return { dependencies, workflowFinder, telemetry, tool, resolve };
}

type Payload = {
	success: boolean;
	dependencies: Array<Record<string, unknown>>;
	nextCursor: string | null;
	inaccessibleCount: number;
	withheldCount?: number;
	mayBeIncomplete: boolean;
	incompleteReasons: Array<{ code: string; message: string }>;
	error?: string;
};

const payloadOf = (result: unknown) => (result as { structuredContent: Payload }).structuredContent;

describe('get_dependencies', () => {
	it('maps types to the public names and labels the versions', async () => {
		const { tool, resolve, workflowFinder } = harness();
		resolve(
			[
				{ type: 'workflowParent', id: 'wf-2', name: 'Caller', versions: ['published'] },
				{ type: 'credentialId', id: 'cred-1', name: 'Slack', versions: ['draft', 'published'] },
				{ type: 'agentUsage', id: 'agent-1', name: 'Helper', projectId: 'p-1' },
			],
			2,
		);
		workflowFinder.findWorkflowsByIdsForUser.mockResolvedValue([workflowEntity({ id: 'wf-2' })]);

		const payload = payloadOf(
			await tool.handler({ resourceType: 'workflow', resourceId: 'wf-1' }, mock()),
		);

		expect(payload).toEqual({
			success: true,
			resourceType: 'workflow',
			resourceId: 'wf-1',
			dependencies: [
				{ type: 'agent', id: 'agent-1', name: 'Helper', projectId: 'p-1' },
				{ type: 'credential', id: 'cred-1', name: 'Slack', versions: 'both' },
				{
					type: 'parentWorkflow',
					id: 'wf-2',
					name: 'Caller',
					versions: 'published',
					editableInMcp: true,
				},
			],
			nextCursor: null,
			inaccessibleCount: 2,
			mayBeIncomplete: false,
			incompleteReasons: [],
		});
	});

	it('says why a workflow item is not editable', async () => {
		const { tool, resolve, workflowFinder } = harness();
		resolve([
			{ type: 'workflowParent', id: 'wf-hidden', name: 'A' },
			{ type: 'workflowParent', id: 'wf-archived', name: 'B' },
			{ type: 'workflowParent', id: 'wf-no-update', name: 'C' },
		]);
		workflowFinder.findWorkflowsByIdsForUser.mockResolvedValue([
			workflowEntity({ id: 'wf-hidden', settings: { availableInMCP: false } }),
			workflowEntity({ id: 'wf-archived', isArchived: true }),
		]);

		const payload = payloadOf(
			await tool.handler({ resourceType: 'workflow', resourceId: 'wf-1' }, mock()),
		);

		expect(workflowFinder.findWorkflowsByIdsForUser).toHaveBeenCalledWith(
			['wf-hidden', 'wf-archived', 'wf-no-update'],
			user,
			['workflow:update'],
		);
		expect(payload.dependencies.map((d) => [d.id, d.editableInMcp, d.notEditableReason])).toEqual([
			['wf-hidden', false, 'not_available_in_mcp'],
			['wf-archived', false, 'archived'],
			['wf-no-update', false, 'no_permission'],
		]);
	});

	it('marks workflows as not editable when the session has no write tools', async () => {
		const { tool, resolve, workflowFinder } = harness({ workflowWriteAvailable: false });
		resolve([{ type: 'workflowCall', id: 'wf-2', name: 'Sub' }]);

		const payload = payloadOf(
			await tool.handler({ resourceType: 'workflow', resourceId: 'wf-1' }, mock()),
		);

		expect(workflowFinder.findWorkflowsByIdsForUser).not.toHaveBeenCalled();
		expect(payload.dependencies[0]).toMatchObject({
			editableInMcp: false,
			notEditableReason: 'write_tools_unavailable',
		});
	});

	it('pages through the list with a cursor', async () => {
		const { tool, resolve } = harness();
		resolve([
			{ type: 'credentialId', id: 'c', name: 'C' },
			{ type: 'credentialId', id: 'a', name: 'A' },
			{ type: 'credentialId', id: 'b', name: 'B' },
		]);

		const first = payloadOf(
			await tool.handler({ resourceType: 'workflow', resourceId: 'wf-1', limit: 2 }, mock()),
		);
		expect(first.dependencies.map((d) => d.id)).toEqual(['a', 'b']);
		expect(first.nextCursor).toEqual(expect.any(String));

		const second = payloadOf(
			await tool.handler(
				{ resourceType: 'workflow', resourceId: 'wf-1', limit: 2, cursor: first.nextCursor! },
				mock(),
			),
		);
		expect(second.dependencies.map((d) => d.id)).toEqual(['c']);
		expect(second.nextCursor).toBeNull();
	});

	it('rejects a cursor it did not issue', async () => {
		const { tool } = harness();

		const result = await tool.handler(
			{ resourceType: 'workflow', resourceId: 'wf-1', cursor: 'not-a-cursor' },
			mock(),
		);

		expect(result).toMatchObject({ isError: true });
		expect(payloadOf(result).error).toMatch(/cursor/);
	});

	it('withholds item types that the session is not granted to read', async () => {
		const { tool, resolve } = harness({ credentialGranted: false, agentGranted: false });
		resolve([
			{ type: 'credentialId', id: 'cred-1', name: 'Slack' },
			{ type: 'agentUsage', id: 'agent-1', name: 'Helper' },
			{ type: 'dataTableId', id: 'dt-1', name: 'Leads' },
		]);

		const payload = payloadOf(
			await tool.handler({ resourceType: 'workflow', resourceId: 'wf-1' }, mock()),
		);

		expect(payload.dependencies.map((d) => d.id)).toEqual(['dt-1']);
		expect(payload.withheldCount).toBe(2);
	});

	it('refuses a credential when the session is not granted to read credentials', async () => {
		const { tool, dependencies } = harness({ credentialGranted: false });

		const result = await tool.handler({ resourceType: 'credential', resourceId: 'cred-1' }, mock());

		expect(result).toMatchObject({ isError: true });
		expect(dependencies.getResourceDependencies).not.toHaveBeenCalled();
	});

	it('refuses a resource the user cannot read', async () => {
		const { tool, dependencies } = harness();
		dependencies.canReadResource.mockResolvedValue(false);

		const result = await tool.handler({ resourceType: 'dataTable', resourceId: 'dt-1' }, mock());

		expect(result).toMatchObject({ isError: true });
		expect(dependencies.getResourceDependencies).not.toHaveBeenCalled();
	});

	it('refuses a workflow that is not available in MCP', async () => {
		const { tool, workflowFinder, telemetry } = harness();
		workflowFinder.findWorkflowForUser.mockResolvedValue(
			workflowEntity({ id: 'wf-1', settings: { availableInMCP: false } }),
		);

		const result = await tool.handler({ resourceType: 'workflow', resourceId: 'wf-1' }, mock());

		expect(result).toMatchObject({ isError: true });
		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({
				results: expect.objectContaining({ success: false, error_reason: 'not_available_in_mcp' }),
			}),
		);
	});

	it('reads an archived workflow', async () => {
		const { tool, workflowFinder } = harness();
		workflowFinder.findWorkflowForUser.mockResolvedValue(
			workflowEntity({ id: 'wf-1', isArchived: true }),
		);

		const payload = payloadOf(
			await tool.handler({ resourceType: 'workflow', resourceId: 'wf-1' }, mock()),
		);

		expect(payload.success).toBe(true);
	});

	it('says when the list may be incomplete, and why', async () => {
		const { tool, dependencies } = harness();
		dependencies.getDependencyListGaps.mockResolvedValue([
			{ reason: 'runtimeCallers', workflowCount: 3 },
			{ reason: 'indexOutdated' },
		]);

		const payload = payloadOf(
			await tool.handler({ resourceType: 'workflow', resourceId: 'wf-1' }, mock()),
		);

		expect(payload.mayBeIncomplete).toBe(true);
		expect(payload.incompleteReasons.map((r) => r.code)).toEqual([
			'runtimeCallers',
			'indexOutdated',
		]);
		expect(payload.incompleteReasons[0].message).toContain('3 workflows pick a sub-workflow');
	});

	it('throws unexpected errors rather than returning them', async () => {
		const { tool, dependencies } = harness();
		dependencies.getResourceDependencies.mockRejectedValue(new Error('db down'));

		await expect(
			tool.handler({ resourceType: 'workflow', resourceId: 'wf-1' }, mock()),
		).rejects.toThrow('db down');
	});
});
