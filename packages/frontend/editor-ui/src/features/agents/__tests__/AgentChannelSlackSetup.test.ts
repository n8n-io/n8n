import { createComponentRenderer } from '@/__tests__/render';
import { ResponseError } from '@n8n/rest-api-client';
import { fireEvent, waitFor } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';

import AgentChannelSlackSetup from '../components/AgentChannelSlackSetup.vue';

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
				mode: 'setup',
				setupMode: 'simple',
			},
		});

		expect(queryByTestId('slack-manual-configuration')).toBeNull();
	});

	it('shows manual configuration in advanced setup mode', () => {
		const { getByTestId } = renderComponent({
			props: {
				mode: 'setup',
				setupMode: 'advanced',
			},
		});

		expect(getByTestId('slack-manual-configuration')).toBeInTheDocument();
	});

	it('surfaces the backend ResponseError message when the Slack app install fails', async () => {
		// Mirrors makeRestApiRequest: BadRequest body becomes ResponseError.message.
		const setupSlackApp = vi
			.fn()
			.mockRejectedValue(
				new ResponseError(
					'Agent configuration is incomplete. Fix these before connecting a channel: model',
					{ httpStatusCode: 400 },
				),
			);

		const { getByTestId } = renderComponent({
			props: {
				mode: 'setup',
				setupSlackApp,
			},
		});

		// Type a token so the install button becomes enabled.
		// N8nInput forwards data-* attrs onto the native <input>.
		const tokenField = getByTestId('slack-app-configuration-token');
		const tokenInput =
			tokenField instanceof HTMLInputElement ? tokenField : tokenField.querySelector('input');
		await fireEvent.update(tokenInput!, 'xoxe-config-token');

		// Trigger the install.
		await fireEvent.click(getByTestId('slack-create-app'));

		// The backend's actionable message is rendered alongside the generic error.
		await waitFor(() => {
			expect(getByTestId('slack-app-setup-error-detail')).toHaveTextContent(
				'Agent configuration is incomplete. Fix these before connecting a channel: model',
			);
		});
		expect(setupSlackApp).toHaveBeenCalledWith('xoxe-config-token');
	});
});
