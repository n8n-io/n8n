import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { InstanceContextService } from '@/modules/instance-ai/instance-context.service';
import type { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import {
	createGetInstanceContextTool,
	EMPTY_INSTANCE_CONTEXT_TEXT,
} from '../tools/get-instance-context.tool';

const user = mock<User>({ id: 'user-1' });

function harness() {
	const instanceContext = mock<InstanceContextService>();
	const telemetry = mock<Telemetry>();

	instanceContext.buildBlock.mockResolvedValue(null);

	return {
		instanceContext,
		telemetry,
		tool: createGetInstanceContextTool(user, instanceContext, telemetry),
	};
}

const payloadOf = (result: unknown) =>
	(result as { structuredContent: Record<string, unknown> }).structuredContent;

const textOf = (result: unknown) =>
	(result as { content: Array<{ text: string }> }).content[0].text;

describe('get_instance_context', () => {
	it('reads under the MCP surface with credentials withheld', async () => {
		const { tool, instanceContext } = harness();

		await tool.handler({}, mock());

		expect(instanceContext.buildBlock).toHaveBeenCalledWith(
			expect.objectContaining({
				scope: { surface: 'mcp', credentialGranted: false },
				// Stateless server, no thread to track against, so every read is a full snapshot.
				cursor: null,
			}),
		);
	});

	it('narrows to one project when the caller names it', async () => {
		const { tool, instanceContext } = harness();

		await tool.handler({ projectId: 'project-1' }, mock());

		expect(instanceContext.buildBlock).toHaveBeenCalledWith(
			expect.objectContaining({
				scope: { surface: 'mcp', credentialGranted: false, projectId: 'project-1' },
			}),
		);
	});

	it('returns the block as prose', async () => {
		const { tool, instanceContext } = harness();
		instanceContext.buildBlock.mockResolvedValue({
			block: 'Workflows that already exist here: 3',
			cursor: { activityMark: 9, activitySeen: [], runsThrough: '2026-09-10T00:00:00.000Z' },
		});

		const result = await tool.handler({}, mock());

		expect(payloadOf(result)).toEqual({ context: 'Workflows that already exist here: 3' });
		expect(textOf(result)).toBe('Workflows that already exist here: 3');
	});

	it('reports a genuinely empty instance as empty', async () => {
		const { tool, instanceContext } = harness();
		instanceContext.buildBlock.mockResolvedValue(null);

		const result = await tool.handler({}, mock());

		expect(payloadOf(result)).toEqual({ empty: true });
		expect(textOf(result)).toBe(EMPTY_INSTANCE_CONTEXT_TEXT);
	});

	/**
	 * The instructions tell an agent an empty instance means "start from a blank page", so a read
	 * failure reported that way would send it off to rebuild work that already exists.
	 */
	it('fails loudly rather than reporting a failed read as an empty instance', async () => {
		const { tool, telemetry, instanceContext } = harness();
		instanceContext.buildBlock.mockRejectedValue(new Error('db is down'));

		await expect(tool.handler({}, mock())).rejects.toThrow('db is down');
		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({
				tool_name: 'get_instance_context',
				results: { success: false, error: 'db is down' },
			}),
		);
	});

	it('tracks a successful call', async () => {
		const { tool, telemetry, instanceContext } = harness();
		instanceContext.buildBlock.mockResolvedValue({
			block: 'Workflows that already exist here: 3',
			cursor: { activityMark: 9, activitySeen: [], runsThrough: '2026-09-10T00:00:00.000Z' },
		});

		await tool.handler({}, mock());

		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({
				tool_name: 'get_instance_context',
				results: { success: true, data: { empty: false } },
			}),
		);
	});
});
