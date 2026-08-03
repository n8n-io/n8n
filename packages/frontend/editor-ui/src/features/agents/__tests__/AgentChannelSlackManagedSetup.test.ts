import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentChannelSlackManagedSetup from '../components/AgentChannelSlackManagedSetup.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

function mountSetup(workspaceCount: number) {
	const connectManager = vi.fn().mockResolvedValue(true);
	const installApp = vi.fn().mockResolvedValue(true);
	const workspaces = Array.from({ length: workspaceCount }, (_, index) => ({
		id: `T${index + 1}`,
		name: `Workspace ${index + 1}`,
		connected: false,
	}));
	const wrapper = mount(AgentChannelSlackManagedSetup, {
		props: {
			setup: {
				managedSetupAvailable: true,
				managerCredentials: [
					{
						id: 'manager',
						name: 'Slack manager',
						connected: true,
						reconnectRequired: false,
						workspaces,
					},
				],
			},
			loading: false,
			credentialPermissions: { create: true },
			connectManager,
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
				N8nText: { template: '<span><slot /></span>' },
			},
		},
	});
	return { wrapper, connectManager, installApp };
}

describe('AgentChannelSlackManagedSetup', () => {
	it('shows a single workspace as static context and installs it', async () => {
		const { wrapper, installApp } = mountSetup(1);

		expect(wrapper.get('[data-testid="slack-managed-workspace-static"]').text()).toBe(
			'Workspace 1',
		);
		await wrapper.get('[data-testid="slack-managed-install"]').trigger('click');

		expect(installApp).toHaveBeenCalledWith('manager', 'T1');
	});

	it('shows the workspace selector when multiple workspaces are available', () => {
		const { wrapper } = mountSetup(2);

		expect(wrapper.find('[data-testid="slack-managed-workspace-select"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="slack-managed-workspace-static"]').exists()).toBe(false);
	});

	it('uses the credential dropdown new-credential action to connect another workspace', async () => {
		const { wrapper, connectManager } = mountSetup(1);

		await wrapper.get('[data-testid="new-manager"]').trigger('click');

		expect(connectManager).toHaveBeenCalledWith();
	});
});
