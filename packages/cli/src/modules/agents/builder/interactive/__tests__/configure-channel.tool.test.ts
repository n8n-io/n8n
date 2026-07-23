import type { InterruptibleToolContext } from '@n8n/agents';
import { channelConfigSchema } from '@n8n/api-types';
import type { Mock } from 'vitest';

import { buildConfigureChannelTool } from '../configure-channel.tool';

interface TestCtx {
	resumeData?: unknown;
	suspend: Mock;
}

function makeCtx(overrides?: { resumeData?: unknown }): TestCtx {
	return {
		resumeData: overrides?.resumeData,
		suspend: vi.fn(async (x: unknown) => x),
	};
}

describe('configure_channel tool', () => {
	function buildTool(availableTypes: string[] = ['slack', 'telegram', 'linear']) {
		return buildConfigureChannelTool({
			agentId: 'agent-1',
			projectId: 'project-1',
			listChatIntegrationTypes: () => availableTypes,
		});
	}

	it('suspends with a channelConfig payload conforming to channelConfigSchema on first call', async () => {
		const ctx = makeCtx();

		await buildTool().handler!(
			{ integrationType: 'slack' },
			ctx as unknown as InterruptibleToolContext,
		);

		expect(ctx.suspend).toHaveBeenCalledTimes(1);
		const payload = ctx.suspend.mock.calls[0][0] as Record<string, unknown>;
		expect(payload).toEqual(
			expect.objectContaining({
				requestId: expect.any(String),
				message: expect.any(String),
				severity: 'info',
				channelConfig: { integrationType: 'slack', agentId: 'agent-1' },
				projectId: 'project-1',
			}),
		);
		expect(() => channelConfigSchema.parse(payload.channelConfig)).not.toThrow();
	});

	it('generates a fresh requestId on every suspend call', async () => {
		const tool = buildTool();
		const ctx1 = makeCtx();
		const ctx2 = makeCtx();

		await tool.handler!({ integrationType: 'slack' }, ctx1 as unknown as InterruptibleToolContext);
		await tool.handler!({ integrationType: 'slack' }, ctx2 as unknown as InterruptibleToolContext);

		const requestId1 = (ctx1.suspend.mock.calls[0][0] as Record<string, unknown>).requestId;
		const requestId2 = (ctx2.suspend.mock.calls[0][0] as Record<string, unknown>).requestId;
		expect(requestId1).not.toBe(requestId2);
	});

	it('rejects an integrationType not returned by listChatIntegrationTypes, listing what is available', async () => {
		const ctx = makeCtx();

		const result = await buildTool().handler!(
			{ integrationType: 'discord' },
			ctx as unknown as InterruptibleToolContext,
		);

		expect(ctx.suspend).not.toHaveBeenCalled();
		expect(result).toEqual(
			expect.objectContaining({
				ok: false,
				errors: [
					expect.objectContaining({
						message: expect.stringContaining('Unsupported chat channel "discord"'),
					}),
				],
			}),
		);

		const emptyResult = (await buildTool([]).handler!(
			{ integrationType: 'slack' },
			ctx as unknown as InterruptibleToolContext,
		)) as { errors: Array<{ message: string }> };
		expect(emptyResult.errors[0].message).toContain('No chat channels are currently available.');
	});

	it('resume leg is handled before validation and returns connected: true on approval', async () => {
		const ctx = makeCtx({ resumeData: { approved: true } });

		// Deliberately pass a type not in the catalog — checkpoint-rebuild safety
		// means the resume leg must not re-validate against the (possibly
		// unavailable) integration catalog.
		const result = await buildTool([]).handler!(
			{ integrationType: 'slack' },
			ctx as unknown as InterruptibleToolContext,
		);

		expect(ctx.suspend).not.toHaveBeenCalled();
		expect(result).toEqual({ connected: true });
	});

	it('returns connected: false when the user skips (dismissal)', async () => {
		const ctx = makeCtx({ resumeData: { approved: false } });

		const result = await buildTool().handler!(
			{ integrationType: 'slack' },
			ctx as unknown as InterruptibleToolContext,
		);

		expect(result).toEqual({ connected: false });
	});
});
