import { createComponentRenderer } from '@/__tests__/render';
import { describe, expect, it, vi } from 'vitest';

import AgentChannelLinearSetup from '../components/AgentChannelLinearSetup.vue';
import AgentChannelSlackSetup from '../components/AgentChannelSlackSetup.vue';
import AgentChannelTelegramSetup from '../components/AgentChannelTelegramSetup.vue';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: {},
	}),
}));

vi.mock('@n8n/design-system', async (importOriginal) => ({
	...(await importOriginal()),
	N8nCollapsiblePanel: {
		template: '<section data-test-id="slack-manual-configuration"><slot /></section>',
	},
}));

vi.mock('../components/AgentChannelSlackSetupSnapshots.vue', () => ({
	default: {
		template: '<div data-test-id="slack-setup-snapshots" />',
	},
}));

vi.mock('../composables/useAgentApi', () => ({
	getSlackAgentAppManifest: vi.fn().mockResolvedValue({ manifest: { display_information: {} } }),
}));

const renderComponent = createComponentRenderer(AgentChannelSlackSetup);

describe('AgentChannelSlackSetup', () => {
	it('hides manual configuration in simple setup mode', () => {
		const { queryByTestId } = renderComponent({
			props: {
				setupMode: 'simple',
			},
		});

		expect(queryByTestId('slack-manual-configuration')).toBeNull();
	});

	it('shows manual configuration in advanced setup mode', () => {
		const { getByTestId } = renderComponent({
			props: {
				setupMode: 'advanced',
			},
		});

		expect(getByTestId('slack-manual-configuration')).toBeInTheDocument();
	});

	it('does not expose publishing state on channel setup components', () => {
		for (const component of [
			AgentChannelSlackSetup,
			AgentChannelLinearSetup,
			AgentChannelTelegramSetup,
		]) {
			const props = (component as unknown as { props: Record<string, unknown> }).props;
			expect(props).not.toHaveProperty('isPublished');
		}
	});
});
