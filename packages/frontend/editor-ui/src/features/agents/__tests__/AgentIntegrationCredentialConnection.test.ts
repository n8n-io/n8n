/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

import AgentIntegrationCredentialConnection from '../components/AgentIntegrationCredentialConnection.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const credentials = [{ id: 'cred-1', name: 'Workspace Slack', typeDisplayName: 'Slack' }];
const credentialPermissions = { create: true };

const AgentCredentialSelectStub = {
	props: [
		'modelValue',
		'credentials',
		'dataTestId',
		'placeholder',
		'credentialPermissions',
		'disabled',
		'size',
	],
	emits: ['create', 'update:modelValue'],
	template: `
		<div
			data-testid="agent-credential-select-stub"
			:data-test-id-prop="dataTestId"
			:data-can-create="String(credentialPermissions.create)"
			:data-disabled="String(!!disabled)"
			:data-size="size"
			:data-model-value="modelValue"
			:data-options="credentials.map((credential) => credential.name).join('|')"
		>
			<button data-testid="stub-create-credential" @click="$emit('create')" />
			<button
				data-testid="stub-select-first-credential"
				@click="$emit('update:modelValue', credentials[0]?.id)"
			/>
		</div>
	`,
};

function mountComponent(props = {}) {
	return mount(AgentIntegrationCredentialConnection, {
		props: {
			integrationType: 'slack',
			integrationLabel: 'Slack',
			modelValue: 'cred-1',
			credentials,
			credentialPermissions,
			showConnectButton: true,
			errorMessage: 'Could not connect Slack',
			...props,
		},
		global: {
			stubs: {
				AgentCredentialSelect: AgentCredentialSelectStub,
				N8nButton: {
					props: ['disabled', 'loading'],
					emits: ['click'],
					template:
						'<button v-bind="$attrs" :disabled="disabled || loading" @click="$emit(\'click\', $event)"><slot name="prefix" /><slot /></button>',
				},
				N8nIcon: { template: '<i />' },
				N8nText: { template: '<span><slot /></span>' },
			},
		},
	});
}

describe('AgentIntegrationCredentialConnection', () => {
	it('renders credential selection actions and emits parent events', async () => {
		const wrapper = mountComponent();

		expect(wrapper.text()).toContain('Slack agents.builder.addTrigger.credential');
		const picker = wrapper.find('[data-testid="agent-credential-select-stub"]');
		expect(picker.attributes('data-test-id-prop')).toBe('slack-credential-select');
		expect(picker.attributes('data-can-create')).toBe('true');
		expect(picker.attributes('data-size')).toBe('large');
		expect(picker.attributes('data-model-value')).toBe('cred-1');
		expect(wrapper.find('[data-testid="slack-edit-credential"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="slack-connect-button"]').exists()).toBe(true);
		expect(wrapper.text()).toContain('Could not connect Slack');

		await wrapper.find('[data-testid="stub-select-first-credential"]').trigger('click');
		await wrapper.find('[data-testid="stub-create-credential"]').trigger('click');
		await wrapper.find('[data-testid="slack-edit-credential"]').trigger('click');
		await wrapper.find('[data-testid="slack-connect-button"]').trigger('click');

		expect(wrapper.emitted('update:modelValue')).toEqual([[credentials[0].id]]);
		expect(wrapper.emitted('create')).toEqual([[]]);
		expect(wrapper.emitted('edit')).toEqual([[]]);
		expect(wrapper.emitted('connect')).toEqual([[]]);
	});

	it('renders connected state with a disabled picker and disconnect action', async () => {
		const wrapper = mountComponent({
			connected: true,
			connectedDescription: 'Slack is ready',
			disabled: true,
			showConnectButton: false,
			showDisconnectButton: true,
			errorMessage: '',
		});

		expect(wrapper.find('[data-testid="slack-connected-description"]').text()).toBe(
			'Slack is ready',
		);
		expect(
			wrapper.find('[data-testid="agent-credential-select-stub"]').attributes('data-disabled'),
		).toBe('true');
		expect(wrapper.find('[data-testid="slack-edit-credential"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="slack-connect-button"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="slack-disconnect-button"]').exists()).toBe(true);

		await wrapper.find('[data-testid="slack-disconnect-button"]').trigger('click');

		expect(wrapper.emitted('disconnect')).toEqual([[]]);
	});
});
