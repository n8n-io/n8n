import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { WorkflowDependencyQueryService } from '@/modules/workflow-index/workflow-dependency-query.service';
import type { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { createGetNodeUsageTool } from '../tools/get-node-usage.tool';

const user = mock<User>({ id: 'user-1' });

function harness() {
	const dependencies = mock<WorkflowDependencyQueryService>();
	const telemetry = mock<Telemetry>();

	dependencies.getNodeTypeUsage.mockResolvedValue({ workflowsInScope: 0 });

	return { dependencies, telemetry, tool: createGetNodeUsageTool(user, dependencies, telemetry) };
}

const payloadOf = (result: unknown) =>
	(result as { structuredContent: Record<string, unknown> }).structuredContent;

describe('get_node_usage', () => {
	it('returns the histogram with the denominator it is counted against', async () => {
		const { tool, dependencies } = harness();
		dependencies.getNodeTypeUsage.mockResolvedValue({
			workflowsInScope: 42,
			nodeTypes: [{ nodeType: 'n8n-nodes-base.httpRequest', workflowCount: 30 }],
		});

		const payload = payloadOf(await tool.handler({}, mock()));

		expect(payload).toEqual({
			workflowsInScope: 42,
			nodeTypes: [{ nodeType: 'n8n-nodes-base.httpRequest', workflowCount: 30 }],
		});
	});

	it('serialises workflow timestamps rather than leaking Date objects', async () => {
		const { tool, dependencies } = harness();
		dependencies.getNodeTypeUsage.mockResolvedValue({
			workflowsInScope: 42,
			workflows: [
				{
					workflowId: 'wf-1',
					name: 'Lead enrichment',
					updatedAt: new Date('2026-09-09T10:00:00Z'),
				},
			],
		});

		const payload = payloadOf(await tool.handler({ nodeType: 'n8n-nodes-base.slack' }, mock()));

		expect(payload).toEqual({
			workflowsInScope: 42,
			workflows: [
				{ workflowId: 'wf-1', name: 'Lead enrichment', updatedAt: '2026-09-09T10:00:00.000Z' },
			],
		});
	});

	/** Absence is not evidence of non-use when the list was cut short, so the flag has to survive. */
	it('carries the truncation flag through', async () => {
		const { tool, dependencies } = harness();
		dependencies.getNodeTypeUsage.mockResolvedValue({
			workflowsInScope: 42,
			nodeTypes: [],
			truncated: true,
		});

		expect(payloadOf(await tool.handler({}, mock()))).toMatchObject({ truncated: true });
	});

	it('omits the truncation flag when the list was complete', async () => {
		const { tool, dependencies } = harness();
		dependencies.getNodeTypeUsage.mockResolvedValue({ workflowsInScope: 42, nodeTypes: [] });

		expect(payloadOf(await tool.handler({}, mock()))).not.toHaveProperty('truncated');
	});

	it('passes the node type and project through, and caps the limit', async () => {
		const { tool, dependencies } = harness();

		await tool.handler(
			{ nodeType: 'n8n-nodes-base.slack', projectId: 'project-1', limit: 5_000 },
			mock(),
		);

		expect(dependencies.getNodeTypeUsage).toHaveBeenCalledWith(user, {
			nodeType: 'n8n-nodes-base.slack',
			projectId: 'project-1',
			limit: 100,
		});
	});

	/** The service picks its own defaults, which differ per branch, so an absent limit stays absent. */
	it('does not invent a limit the caller did not give', async () => {
		const { tool, dependencies } = harness();

		await tool.handler({}, mock());

		expect(dependencies.getNodeTypeUsage).toHaveBeenCalledWith(user, {});
	});

	it('tracks a failed call and rethrows', async () => {
		const { tool, dependencies, telemetry } = harness();
		dependencies.getNodeTypeUsage.mockRejectedValue(new Error('index is cold'));

		await expect(tool.handler({}, mock())).rejects.toThrow('index is cold');
		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({
				tool_name: 'get_node_usage',
				results: { success: false, error: 'index is cold' },
			}),
		);
	});
});
