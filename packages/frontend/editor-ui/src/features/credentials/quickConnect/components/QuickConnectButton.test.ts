import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import QuickConnectButton from './QuickConnectButton.vue';
import type { RenderOptions } from '@/__tests__/render';
import { createComponentRenderer } from '@/__tests__/render';
import { useCredentialsStore } from '../../credentials.store';
import { mockedStore } from '@/__tests__/utils';
import type { ICredentialType } from 'n8n-workflow';

vi.mock('@/app/composables/useWorkflowState', () => ({
	injectWorkflowState: vi.fn(),
}));

const googleSheetsOAuth2Api: ICredentialType = {
	name: 'googleSheetsOAuth2Api',
	extends: ['googleOAuth2Api'],
	displayName: 'Google Sheets OAuth2 API',
	properties: [],
};

const googleOAuth2Api: ICredentialType = {
	name: 'googleOAuth2Api',
	extends: ['oAuth2Api'],
	displayName: 'Google OAuth2 API',
	properties: [],
};

const defaultRenderOptions: RenderOptions<typeof QuickConnectButton> = {
	pinia: createTestingPinia({ stubActions: false }),
	props: {
		credentialTypeName: 'slackOAuth2Api',
		serviceName: 'Slack',
	},
};

const renderComponent = createComponentRenderer(QuickConnectButton, defaultRenderOptions);

describe('QuickConnectButton', () => {
	beforeAll(() => {
		const credentialsStore = mockedStore(useCredentialsStore);
		credentialsStore.state.credentialTypes = {
			googleOAuth2Api,
			googleSheetsOAuth2Api,
		};
	});

	it('should render generic button for non-Google OAuth types', () => {
		renderComponent();

		expect(screen.getByRole('button')).toBeInTheDocument();
		expect(screen.queryByTitle('Sign in with Google')).not.toBeInTheDocument();
	});

	it('should render GoogleAuthButton for Google OAuth types', () => {
		renderComponent({
			props: { credentialTypeName: 'googleSheetsOAuth2Api', serviceName: 'Google Sheets' },
		});

		expect(screen.getByTitle('Sign in with Google')).toBeInTheDocument();
	});

	it('should emit click event when clicked', async () => {
		const { emitted } = renderComponent();

		const button = screen.getByRole('button');
		await userEvent.click(button);

		expect(emitted('click')).toBeTruthy();
	});

	it('should use custom label when provided', () => {
		renderComponent({
			props: {
				credentialTypeName: 'slackOAuth2Api',
				serviceName: 'Slack',
				label: 'Reconnect',
			},
		});

		expect(screen.getByText('Reconnect')).toBeInTheDocument();
	});

	it('should disable button when disabled prop is true', () => {
		renderComponent({
			props: {
				credentialTypeName: 'slackOAuth2Api',
				serviceName: 'Slack',
				disabled: true,
			},
		});

		expect(screen.getByRole('button')).toBeDisabled();
	});
});
