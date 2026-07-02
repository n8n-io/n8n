import type { Mock } from 'vitest';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiContext } from '../../../types';
import { createConfigureChannelTool } from '../configure-channel.tool';

function createContext(overrides: Partial<InstanceAiContext> = {}): InstanceAiContext {
	return {
		userId: 'user-1',
		projectId: 'project-1',
		agentBuilderService: {} as InstanceAiContext['agentBuilderService'],
		agentBuilderTarget: { agentId: 'agent-1', projectId: 'project-1' },
		...overrides,
	} as unknown as InstanceAiContext;
}

function suspendCtx(suspendFn: Mock = vi.fn()) {
	return { resumeData: undefined, suspend: suspendFn } as never;
}

function resumeCtx(resumeData: { approved: boolean }) {
	return { resumeData, suspend: vi.fn() } as never;
}

describe('configure_channel tool', () => {
	it('suspends with a channel-config payload on first call', async () => {
		const suspendFn = vi.fn();
		await executeTool(
			createConfigureChannelTool(createContext()),
			{ integrationType: 'slack' },
			suspendCtx(suspendFn),
		);

		expect(suspendFn).toHaveBeenCalledTimes(1);
		expect(suspendFn.mock.calls[0][0]).toEqual(
			expect.objectContaining({
				inputType: 'channel-config',
				severity: 'info',
				channelConfig: { integrationType: 'slack', agentId: 'agent-1' },
				projectId: 'project-1',
			}),
		);
	});

	it('returns connected: true when the user connected (approved)', async () => {
		const result = await executeTool<{ connected: boolean }>(
			createConfigureChannelTool(createContext()),
			{ integrationType: 'telegram' },
			resumeCtx({ approved: true }),
		);
		expect(result).toEqual({ connected: true });
	});

	it('returns connected: false when the user skipped', async () => {
		const result = await executeTool<{ connected: boolean }>(
			createConfigureChannelTool(createContext()),
			{ integrationType: 'linear' },
			resumeCtx({ approved: false }),
		);
		expect(result).toEqual({ connected: false });
	});

	it('is inert when no agent is being built', async () => {
		const result = await executeTool<{ ok: boolean }>(
			createConfigureChannelTool(createContext({ agentBuilderTarget: undefined })),
			{ integrationType: 'slack' },
			suspendCtx(),
		);
		expect(result).toEqual(expect.objectContaining({ ok: false }));
	});
});
