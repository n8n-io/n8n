import { createModel } from '@n8n/agents';
import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
import { generateText } from 'ai';
import { mock } from 'vitest-mock-extended';

import { InstanceAiCreditService } from '@/modules/instance-ai/instance-ai-credit.service';
import { InstanceAiModelService } from '@/modules/instance-ai/instance-ai-model.service';
import { InstanceAiSettingsService } from '@/modules/instance-ai/instance-ai-settings.service';

import { TextDraftAdapter } from '../text-draft.adapter';

// The adapter loads the Assistant services only when it needs them. A stub keeps this test small.
vi.mock('@/modules/instance-ai/instance-ai-settings.service', () => ({
	InstanceAiSettingsService: class {},
}));
vi.mock('@/modules/instance-ai/instance-ai-model.service', () => ({
	InstanceAiModelService: class {},
}));
vi.mock('@/modules/instance-ai/instance-ai-credit.service', () => ({
	InstanceAiCreditService: class {},
}));
vi.mock('@n8n/agents', () => ({
	createModel: vi.fn(),
	getCatalogModelId: vi.fn(() => 'anthropic/claude-sonnet-4-5'),
}));
vi.mock('ai', () => ({ generateText: vi.fn() }));
vi.mock('@/utils/ai-proxy-fetch', () => ({ createAiProxyFetch: vi.fn(() => vi.fn()) }));

const generateTextMock = vi.mocked(generateText);

const member = mock<User>({ id: 'user-1', role: { slug: 'global:member', scopes: [] } });

function setup({
	moduleActive = true,
	enabled = true,
	modelConfigured = true,
	scopes = [{ slug: 'instanceAi:message' }],
	credits = { creditsQuota: 100, creditsClaimed: 10 },
}: {
	moduleActive?: boolean;
	enabled?: boolean;
	modelConfigured?: boolean;
	scopes?: Array<{ slug: Scope }>;
	credits?: { creditsQuota: number; creditsClaimed: number } | Error;
} = {}) {
	const moduleRegistry = mock<ModuleRegistry>();
	moduleRegistry.isActive.mockImplementation((name) => moduleActive && name === 'instance-ai');
	const settings = mock<InstanceAiSettingsService>();
	settings.isInstanceAiEnabled.mockReturnValue(enabled);
	settings.isModelConfigured.mockResolvedValue(modelConfigured);
	Container.set(InstanceAiSettingsService, settings);
	const models = mock<InstanceAiModelService>();
	models.resolveAgentModelConfig.mockResolvedValue('anthropic/claude-sonnet-4-5');
	if (credits instanceof Error) models.getCredits.mockRejectedValue(credits);
	else models.getCredits.mockResolvedValue(credits);
	Container.set(InstanceAiModelService, models);
	const creditService = mock<InstanceAiCreditService>();
	Container.set(InstanceAiCreditService, creditService);
	vi.mocked(createModel).mockReturnValue({} as never);
	const user = mock<User>({ ...member, role: { slug: 'global:member', scopes } });
	const logger = mock<Logger>();
	return {
		user,
		logger,
		creditService,
		adapter: new TextDraftAdapter(moduleRegistry, mock<OutboundHttp>(), logger),
	};
}

describe('TextDraftAdapter', () => {
	it('is available when the Assistant is on, has a model, and the person may use it', async () => {
		const { adapter, user } = setup();

		await expect(adapter.isAvailable(user)).resolves.toBe(true);
	});

	it.each([
		['the Assistant module is off', { moduleActive: false }],
		['the Assistant is turned off', { enabled: false }],
		['the Assistant has no model', { modelConfigured: false }],
		['the person may not use the Assistant', { scopes: [] }],
	])('is not available when %s', async (_case, options) => {
		const { adapter, user } = setup(options);

		await expect(adapter.isAvailable(user)).resolves.toBe(false);
	});

	it('reports "not available" without a model call', async () => {
		const { adapter, user } = setup({ enabled: false });

		await expect(adapter.draft(user, 'Write a draft.')).resolves.toEqual({
			status: 'not_available',
		});
	});

	it('gives the text that the model wrote', async () => {
		const { adapter, user } = setup();
		generateTextMock.mockResolvedValueOnce({ text: '{"toolName":"get_numbers"}' } as never);

		await expect(adapter.draft(user, 'Write a draft.')).resolves.toEqual({
			status: 'drafted',
			text: '{"toolName":"get_numbers"}',
		});
		expect(generateTextMock).toHaveBeenCalledWith(
			expect.objectContaining({ prompt: 'Write a draft.', maxOutputTokens: 1_000 }),
		);
	});

	it('claims the credits of the model call for the person', async () => {
		const { adapter, user, creditService } = setup();
		generateTextMock.mockResolvedValueOnce({
			text: '{"toolName":"get_numbers"}',
			usage: { inputTokens: 300, outputTokens: 20, totalTokens: 320 },
		} as never);

		await adapter.draft(user, 'Write a draft.');

		expect(creditService.claimSideCallUsage).toHaveBeenCalledWith(
			user,
			'mcp-server-tool-drafts',
			expect.stringMatching(/^mcp-server-tool-draft:/),
			{
				model: 'anthropic/claude-sonnet-4-5',
				usage: { promptTokens: 300, completionTokens: 20, totalTokens: 320 },
			},
		);
	});

	it('reports "no credits" without a model call when the balance is used up', async () => {
		const { adapter, user } = setup({ credits: { creditsQuota: 100, creditsClaimed: 100 } });

		await expect(adapter.draft(user, 'Write a draft.')).resolves.toEqual({
			status: 'no_credits',
		});
		expect(generateTextMock).not.toHaveBeenCalled();
	});

	it('writes the draft when the balance cannot be read', async () => {
		const { adapter, user } = setup({ credits: new Error('Service down') });
		generateTextMock.mockResolvedValueOnce({ text: 'draft', usage: {} } as never);

		await expect(adapter.draft(user, 'Write a draft.')).resolves.toEqual({
			status: 'drafted',
			text: 'draft',
		});
	});

	it('throws a failed model call, and logs it without the key', async () => {
		const { adapter, user, logger } = setup();
		const key = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789';
		generateTextMock.mockRejectedValueOnce(new Error(`Invalid API key: ${key}`));

		await expect(adapter.draft(user, 'Write a draft.')).rejects.toThrow();
		expect(logger.warn).toHaveBeenCalledTimes(1);
		expect(JSON.stringify(logger.warn.mock.calls[0])).not.toContain('sk-ant-');
	});
});
