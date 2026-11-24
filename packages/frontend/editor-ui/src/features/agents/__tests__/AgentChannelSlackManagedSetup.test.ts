import { mount } from '@vue/test-utils';
import { ResponseError } from '@n8n/rest-api-client';
import { describe, expect, it, vi } from 'vitest';

import AgentChannelSlackManagedSetup from '../components/AgentChannelSlackManagedSetup.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

function mountSetup(workspaceCount: number, managerCredentialCount = 1, installError?: Error) {
	const connectManager = vi.fn().mockResolvedValue(true);
	const editManager = vi.fn();
	const installApp = installError
		? vi.fn().mockRejectedValue(installError)
		: vi.fn().mockResolvedValue(true);
	const workspaces = Array.from({ length: workspaceCount }, (_, index) => ({
		id: `T${index + 1}`,
		name: `Workspace ${index + 1}`,
		connected: false,
	}));
	const wrapper = mount(AgentChannelSlackManagedSetup, {
		props: {
			setup: {
				managedSetupAvailable: true,
				managerCredentials: Array.from({ length: managerCredentialCount }, (_, index) => ({
					id: index === 0 ? 'manager' : `manager-${index + 1}`,
					name: `Slack manager ${index + 1}`,
					connected: true,
					reconnectRequired: false,
					workspaces,
				})),
			},
			loading: false,
			credentialPermissions: { create: true },
			connectManager,
			editManager,
			installApp,
		},
		global: {
			stubs: {
				N8nStepper: {
					template:
						'<div><slot :step="{ id: \'connect\' }" /><slot :step="{ id: \'install\' }" /></div>',
				},
				N8nSelect: {
					props: ['modelValue'],
					emits: ['update:modelValue'],
					template: '<select><slot /></select>',
				},
				N8nOption: { template: '<option />' },
				CredentialsDropdown: {
					emits: ['credentialSelected', 'newCredential'],
					template:
						'<div><button data-testid="select-manager" @click="$emit(\'credentialSelected\', \'manager\')" /><button data-testid="new-manager" @click="$emit(\'newCredential\')" /></div>',
				},
				N8nButton: {
					emits: ['click'],
					template: '<button @click="$emit(\'click\')"><slot /></button>',
				},
				N8nIcon: { template: '<span />' },
				N8nIconButton: {
					emits: ['click'],
					template: '<button @click="$emit(\'click\')" />',
				},
				N8nText: { template: '<span><slot /></span>' },
				N8nTooltip: { template: '<div><slot /></div>' },
			},
		},
	});
	return { wrapper, connectManager, editManager, installApp };
}

describe('AgentChannelSlackManagedSetup', () => {
	it('selects the only workspace and installs it', async () => {
		const { wrapper, installApp } = mountSetup(1);

		expect(wrapper.find('[data-testid="slack-managed-workspace-select"]').exists()).toBe(true);
		await wrapper.get('[data-testid="slack-managed-install"]').trigger('click');

		expect(installApp).toHaveBeenCalledWith('manager', 'T1');
	});

	it('shows the workspace selector when multiple workspaces are available', () => {
		const { wrapper } = mountSetup(2);

		expect(wrapper.find('[data-testid="slack-managed-workspace-select"]').exists()).toBe(true);
	});

	it('shows the Slack app limit message when installation exceeds service limits', async () => {
		const error = new ResponseError('Slack could not install the Slack app', {
			httpStatusCode: 400,
			meta: {
				integrationType: 'slack',
				code: 'service_limits_exceeded',
			},
		});
		const { wrapper } = mountSetup(1, 1, error);

		await wrapper.get('[data-testid="slack-managed-install"]').trigger('click');

		expect(wrapper.get('[data-testid="slack-managed-service-limit-error"]').text()).toContain(
			'agents.channels.slack.managed.serviceLimitsExceeded.message',
		);
		expect(wrapper.get('[data-testid="slack-managed-service-limit-link"]').attributes('href')).toBe(
			'https://api.slack.com/apps',
		);
		expect(
			wrapper.get('[data-testid="slack-managed-service-limit-link"]').attributes('target'),
		).toBe('_blank');
		expect(wrapper.text()).not.toContain('agents.channels.slack.managed.install.error');
	});

	it.each([
		[
			'app_approval_request_pending',
			'slack-managed-approval-pending-error',
			'agents.channels.slack.managed.install.approvalPending',
		],
		[
			'app_approval_request_denied',
			'slack-managed-approval-denied-error',
			'agents.channels.slack.managed.install.approvalDenied',
		],
	])('shows a specific message for %s', async (code, testId, messageKey) => {
		const error = new ResponseError('Slack could not install the Slack app', {
			httpStatusCode: 400,
			meta: { integrationType: 'slack', code },
		});
		const { wrapper } = mountSetup(1, 1, error);

		await wrapper.get('[data-testid="slack-managed-install"]').trigger('click');

		expect(wrapper.get(`[data-testid="${testId}"]`).text()).toContain(messageKey);
		expect(wrapper.text()).not.toContain('agents.channels.slack.managed.install.error');
	});

	it('uses the credential dropdown new-credential action to connect another workspace', async () => {
		const { wrapper, connectManager } = mountSetup(1);

		await wrapper.get('[data-testid="new-manager"]').trigger('click');

		expect(connectManager).toHaveBeenCalledWith();
	});

	it('shows the Slack quick-connect button when no manager credential exists', async () => {
		const { wrapper, connectManager } = mountSetup(0, 0);

		expect(wrapper.find('[data-test-id="slack-manager-credential-select"]').exists()).toBe(false);
		const connectButton = wrapper.get('[data-testid="slack-manager-connect"]');
		expect(connectButton.attributes('icon')).toBe('slack');
		expect(connectButton.text()).toBe('agents.channels.slack.managed.connect.button');
		await connectButton.trigger('click');

		expect(connectManager).toHaveBeenCalledWith();
	});

	it('shows the credential selector and edit button when a manager credential exists', async () => {
		const { wrapper, editManager } = mountSetup(1);

		expect(wrapper.find('[data-testid="slack-manager-connect"]').exists()).toBe(false);
		expect(wrapper.find('[data-test-id="slack-manager-credential-select"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="select-manager"]').exists()).toBe(true);
		await wrapper.get('[data-testid="slack-manager-edit"]').trigger('click');

		expect(editManager).toHaveBeenCalledWith('manager');
	});
});
