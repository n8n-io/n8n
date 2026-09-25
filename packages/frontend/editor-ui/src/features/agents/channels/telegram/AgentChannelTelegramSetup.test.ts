import { createComponentRenderer } from '@/__tests__/render';
import { describe, expect, it, vi } from 'vitest';

import AgentChannelTelegramSetup from './AgentChannelTelegramSetup.vue';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('@n8n/design-system', async (importOriginal) => ({
	...(await importOriginal()),
	N8nStepper: {
		template: `<div><slot :step="{ id: 'connect' }" /></div>`,
	},
}));

const renderComponent = createComponentRenderer(AgentChannelTelegramSetup);

describe('AgentChannelTelegramSetup', () => {
	it('shows connection errors below the connect button', () => {
		const { getByText } = renderComponent({
			props: {
				mode: 'setup',
				modelValue: 'telegram-credential',
				integration: {
					type: 'telegram',
					label: 'Telegram',
					icon: 'telegram',
					credentialTypes: ['telegramApi'],
				},
				credentials: [],
				credentialPermissions: { create: true },
				agentName: 'Agent',
				projectId: 'project-id',
				agentId: 'agent-id',
				errorMessage: 'Telegram credential is already connected to agent "Alex"',
				errorIsConflict: true,
			},
		});

		expect(getByText('Telegram credential is already connected to agent "Alex"')).toBeVisible();
	});
});
