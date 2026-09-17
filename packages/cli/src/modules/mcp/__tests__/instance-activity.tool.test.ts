import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { InstanceContextService } from '@/modules/instance-ai/instance-context.service';
import type { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import {
	createExpandInstanceActivityTool,
	createGetInstanceActivityTool,
} from '../tools/instance-activity.tool';

const user = mock<User>({ id: 'user-1' });

const entry = {
	id: 7,
	at: '2026-09-09T10:00:00.000Z',
	category: 'workflow',
	action: 'saved',
	resourceType: 'workflow',
	resourceId: 'wf-1',
	resourceName: 'Lead enrichment',
	byCurrentUser: true,
};

function harness(credentialGranted = true) {
	const instanceContext = mock<InstanceContextService>();
	const telemetry = mock<Telemetry>();

	instanceContext.listPage.mockResolvedValue({ entries: [], hasMore: false });
	instanceContext.expand.mockResolvedValue(null);

	return {
		instanceContext,
		telemetry,
		list: createGetInstanceActivityTool(user, instanceContext, telemetry, { credentialGranted }),
		expand: createExpandInstanceActivityTool(user, instanceContext, telemetry, {
			credentialGranted,
		}),
	};
}

/** The tools return structured content, so a caller reads the payload rather than the text. */
const payloadOf = (result: unknown) =>
	(result as { structuredContent: Record<string, unknown> }).structuredContent;

describe('get_instance_activity', () => {
	it('reads under the MCP surface, never the conversation one', async () => {
		const { list, instanceContext } = harness();

		await list.handler({}, mock());

		expect(instanceContext.listPage).toHaveBeenCalledWith(
			expect.objectContaining({
				scope: { surface: 'mcp', credentialGranted: true },
			}),
		);
	});

	it('carries the credential grant into the scope', async () => {
		const { list, instanceContext } = harness(false);

		await list.handler({}, mock());

		expect(instanceContext.listPage).toHaveBeenCalledWith(
			expect.objectContaining({
				scope: expect.objectContaining({ credentialGranted: false }),
			}),
		);
	});

	it('narrows to one project when the caller names it', async () => {
		const { list, instanceContext } = harness();

		await list.handler({ projectId: 'project-1' }, mock());

		expect(instanceContext.listPage).toHaveBeenCalledWith(
			expect.objectContaining({
				scope: { surface: 'mcp', credentialGranted: true, projectId: 'project-1' },
			}),
		);
	});

	it('defaults the limit and caps it at the maximum', async () => {
		const { list, instanceContext } = harness();

		await list.handler({}, mock());
		expect(instanceContext.listPage).toHaveBeenLastCalledWith(
			expect.objectContaining({ limit: 30 }),
		);

		await list.handler({ limit: 5_000 }, mock());
		expect(instanceContext.listPage).toHaveBeenLastCalledWith(
			expect.objectContaining({ limit: 100 }),
		);
	});

	it('passes the filters through', async () => {
		const { list, instanceContext } = harness();

		await list.handler({ category: 'workflow', resourceId: 'wf-1', beforeId: 40 }, mock());

		expect(instanceContext.listPage).toHaveBeenLastCalledWith(
			expect.objectContaining({ category: 'workflow', resourceId: 'wf-1', beforeId: 40 }),
		);
	});

	/** A short page is not an empty log, and the agent has to be able to tell. */
	it('reports that more is below the page', async () => {
		const { list, instanceContext } = harness();
		instanceContext.listPage.mockResolvedValue({ entries: [entry], hasMore: true });

		const payload = payloadOf(await list.handler({}, mock()));

		expect(payload).toEqual({ entries: [entry], count: 1, hasMore: true });
	});

	it('tracks a successful call', async () => {
		const { list, telemetry, instanceContext } = harness();
		instanceContext.listPage.mockResolvedValue({ entries: [entry], hasMore: false });

		await list.handler({}, mock());

		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({
				tool_name: 'get_instance_activity',
				results: { success: true, data: { count: 1, hasMore: false } },
			}),
		);
	});

	it('tracks a failed call and rethrows', async () => {
		const { list, telemetry, instanceContext } = harness();
		instanceContext.listPage.mockRejectedValue(new Error('db is down'));

		await expect(list.handler({}, mock())).rejects.toThrow('db is down');
		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({
				tool_name: 'get_instance_activity',
				results: { success: false, error: 'db is down' },
			}),
		);
	});
});

describe('expand_instance_activity', () => {
	it('returns the entry with the rest of its history', async () => {
		const { expand, instanceContext } = harness();
		instanceContext.expand.mockResolvedValue({
			entry,
			resourceHistory: [{ ...entry, id: 3, action: 'created' }],
			liveRecordHint: 'get_workflow_details(workflowId="wf-1")',
		});

		const payload = payloadOf(await expand.handler({ id: 7 }, mock()));

		expect(payload).toEqual({
			entry,
			resourceHistory: [{ ...entry, id: 3, action: 'created' }],
			liveRecordHint: 'get_workflow_details(workflowId="wf-1")',
		});
	});

	/**
	 * Pruned, out of scope and withheld all answer the same way, so the id cannot be used to find
	 * out what exists outside the caller's reach.
	 */
	it('answers an unresolvable id with notFound rather than an error', async () => {
		const { expand, instanceContext } = harness();
		instanceContext.expand.mockResolvedValue(null);

		const payload = payloadOf(await expand.handler({ id: 999 }, mock()));

		expect(payload).toEqual({ notFound: true });
	});

	it('omits the live-record hint when there is none', async () => {
		const { expand, instanceContext } = harness();
		instanceContext.expand.mockResolvedValue({ entry, resourceHistory: [] });

		const payload = payloadOf(await expand.handler({ id: 7 }, mock()));

		expect(payload).not.toHaveProperty('liveRecordHint');
	});

	it('carries the credential grant into the scope', async () => {
		const { expand, instanceContext } = harness(false);

		await expand.handler({ id: 7 }, mock());

		expect(instanceContext.expand).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 7,
				scope: { surface: 'mcp', credentialGranted: false },
			}),
		);
	});

	it('tracks a failed call and rethrows', async () => {
		const { expand, telemetry, instanceContext } = harness();
		instanceContext.expand.mockRejectedValue(new Error('db is down'));

		await expect(expand.handler({ id: 7 }, mock())).rejects.toThrow('db is down');
		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({
				tool_name: 'expand_instance_activity',
				results: { success: false, error: 'db is down' },
			}),
		);
	});
});
