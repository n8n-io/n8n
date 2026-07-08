import type { Mock } from 'vitest';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiContext } from '../../../types';
import { createConfigureChannelTool } from '../configure-channel.tool';

const CHAT_INTEGRATIONS = [
	{ type: 'slack', credentialTypes: ['slackOAuth2Api'] },
	{ type: 'telegram', credentialTypes: ['telegramApi'] },
	{ type: 'linear', credentialTypes: ['linearApi'] },
];

function createContext(overrides: Partial<InstanceAiContext> = {}): InstanceAiContext {
	return {
		userId: 'user-1',
		projectId: 'project-1',
		agentBuilderService: {
			listChatIntegrations: vi.fn().mockResolvedValue(CHAT_INTEGRATIONS),
		} as unknown as InstanceAiContext['agentBuilderService'],
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
	it('suspends with a channelConfig payload on first call', async () => {
		const suspendFn = vi.fn();
		await executeTool(
			createConfigureChannelTool(createContext()),
			{ integrationType: 'slack' },
			suspendCtx(suspendFn),
		);

		expect(suspendFn).toHaveBeenCalledTimes(1);
		expect(suspendFn.mock.calls[0][0]).toEqual(
			expect.objectContaining({
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

	it('rejects unsupported channel types from the integration catalog', async () => {
		const suspendFn = vi.fn();
		const result = await executeTool<{ ok: boolean; errors?: Array<{ message: string }> }>(
			createConfigureChannelTool(createContext()),
			{ integrationType: 'discord' },
			suspendCtx(suspendFn),
		);

		expect(result.ok).toBe(false);
		expect(result.errors?.[0].message).toContain('Unsupported chat channel "discord"');
		expect(result.errors?.[0].message).toContain('Available: slack, telegram, linear');
		expect(suspendFn).not.toHaveBeenCalled();
	});

	it('reports the outcome on resume even when the rebuilt context has no builder target', async () => {
		// After a process restart the run is rebuilt from a checkpoint with a fresh
		// context that has no agentBuilderTarget — the resume leg must not require it.
		const result = await executeTool<{ connected: boolean }>(
			createConfigureChannelTool(createContext({ agentBuilderTarget: undefined })),
			{ integrationType: 'slack' },
			resumeCtx({ approved: true }),
		);
		expect(result).toEqual({ connected: true });
	});
});
