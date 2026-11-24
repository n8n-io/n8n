import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { InstanceAiSettingsService } from '@/modules/instance-ai/instance-ai-settings.service';

import { TextDraftAdapter } from '../text-draft.adapter';

// The adapter loads the Assistant services only when it needs them. A stub keeps this test small.
vi.mock('@/modules/instance-ai/instance-ai-settings.service', () => ({
	InstanceAiSettingsService: class {},
}));

const member = mock<User>({ id: 'user-1', role: { slug: 'global:member', scopes: [] } });

function setup({
	moduleActive = true,
	enabled = true,
	modelConfigured = true,
	scopes = [{ slug: 'instanceAi:message' }],
}: {
	moduleActive?: boolean;
	enabled?: boolean;
	modelConfigured?: boolean;
	scopes?: Array<{ slug: string }>;
} = {}) {
	const moduleRegistry = mock<ModuleRegistry>();
	moduleRegistry.isActive.mockImplementation((name) => moduleActive && name === 'instance-ai');
	const settings = mock<InstanceAiSettingsService>();
	settings.isInstanceAiEnabled.mockReturnValue(enabled);
	settings.isModelConfigured.mockResolvedValue(modelConfigured);
	Container.set(InstanceAiSettingsService, settings);
	const user = mock<User>({ ...member, role: { slug: 'global:member', scopes } });
	return {
		user,
		adapter: new TextDraftAdapter(moduleRegistry, mock<OutboundHttp>(), mock<Logger>()),
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
});
