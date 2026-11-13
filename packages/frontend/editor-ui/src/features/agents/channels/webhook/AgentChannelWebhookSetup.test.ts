import { i18nInstance } from '@n8n/i18n';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import AgentChannelWebhookInstructions from './AgentChannelWebhookInstructions.vue';
import AgentChannelWebhookSetup from './AgentChannelWebhookSetup.vue';

const { getAgentWebhookUrl } = vi.hoisted(() => ({ getAgentWebhookUrl: vi.fn() }));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));
vi.mock('@n8n/stores/useRootStore', () => ({ useRootStore: () => ({ restApiContext: {} }) }));
vi.mock('../../composables/useAgentApi', () => ({ getAgentWebhookUrl }));

vi.mock('@n8n/design-system', async (importOriginal) => ({
	...(await importOriginal()),
	N8nStepper: {
		props: ['steps'],
		template: '<div><div v-for="step in steps" :key="step.id"><slot :step="step" /></div></div>',
	},
	N8nSelect: {
		props: ['modelValue'],
		emits: ['update:modelValue'],
		template:
			'<select data-testid="webhook-authentication" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
	},
	N8nOption: { props: ['value', 'label'], template: '<option :value="value">{{ label }}</option>' },
	N8nCopyInput: {
		props: ['value'],
		template: '<input data-testid="webhook-url" :value="value" />',
	},
}));

const stubs = {
	AgentIntegrationCredentialConnection: {
		props: ['credentials'],
		emits: ['create'],
		template:
			'<div data-testid="webhook-credential"><span v-for="c in credentials" :key="c.id">{{ c.name }}</span><button data-testid="webhook-create-credential" @click="$emit(\'create\')" /></div>',
	},
};

function mountView(overrides: Record<string, unknown> = {}) {
	return mount(AgentChannelWebhookSetup, {
		props: {
			mode: 'setup',
			modelValue: '',
			integration: {
				type: 'webhook',
				label: 'Webhook',
				icon: 'webhook',
				credentialTypes: ['httpHeaderAuth', 'jwtAuth'],
			},
			credentials: [
				{ id: 'header-1', name: 'Header key', type: 'httpHeaderAuth' },
				{ id: 'jwt-1', name: 'JWT key', type: 'jwtAuth' },
			],
			credentialPermissions: { create: true },
			credentialsLoading: false,
			loading: false,
			connected: false,
			connectedDescription: '',
			errorMessage: '',
			errorIsConflict: false,
			isPublished: true,
			agentName: 'Agent',
			projectId: 'project-1',
			agentId: 'agent-1',
			forceNewCredential: false,
			simpleSetup: false,
			runtime: { load: async () => {}, loading: ref(false) },
			...overrides,
		},
		// `I18nT` resolves against the real global i18n instance.
		global: { stubs, plugins: [i18nInstance] },
	});
}

describe('AgentChannelWebhookSetup', () => {
	it('starts without authentication, needs no credential, and connects', async () => {
		const wrapper = mountView();

		expect(wrapper.vm.currentSettings).toEqual({ authentication: 'none' });
		expect(wrapper.vm.credentialRequired).toBe(false);
		expect(wrapper.find('[data-testid="webhook-credential"]').exists()).toBe(false);

		await wrapper.get('[data-testid="webhook-connect"]').trigger('click');
		expect(wrapper.emitted('connect')).toHaveLength(1);
	});

	it('offers only credentials of the selected authentication and creates that type', async () => {
		const wrapper = mountView();

		await wrapper.get('[data-testid="webhook-authentication"]').setValue('headerAuth');

		const credential = wrapper.get('[data-testid="webhook-credential"]');
		expect(credential.text()).toContain('Header key');
		expect(credential.text()).not.toContain('JWT key');
		expect(wrapper.vm.credentialRequired).toBe(true);

		await wrapper.get('[data-testid="webhook-create-credential"]').trigger('click');
		expect(wrapper.emitted('create')).toEqual([['httpHeaderAuth']]);
	});

	it('keeps Connect disabled until a credential of the selected authentication is chosen', async () => {
		const wrapper = mountView();

		await wrapper.get('[data-testid="webhook-authentication"]').setValue('headerAuth');
		expect(wrapper.get('[data-testid="webhook-connect"]').attributes('disabled')).toBeDefined();

		await wrapper.setProps({ modelValue: 'header-1' });
		expect(wrapper.get('[data-testid="webhook-connect"]').attributes('disabled')).toBeUndefined();
	});

	it('clears a credential of another type when the authentication changes', async () => {
		const wrapper = mountView({
			mode: 'edit',
			modelValue: 'header-1',
			savedSettings: { authentication: 'headerAuth' },
		});

		await wrapper.get('[data-testid="webhook-authentication"]').setValue('jwtAuth');

		expect(wrapper.emitted('update:modelValue')).toEqual([['']]);
		expect(wrapper.vm.currentSettings).toEqual({ authentication: 'jwtAuth' });
	});

	it('takes saved settings that arrive after it mounts', async () => {
		const wrapper = mountView({ mode: 'edit', modelValue: 'header-1' });

		await wrapper.setProps({ savedSettings: { authentication: 'headerAuth' } });

		expect(wrapper.vm.currentSettings).toEqual({ authentication: 'headerAuth' });
		expect(wrapper.emitted('update:modelValue')).toBeUndefined();
	});

	it('keeps the authentication that the user chose when saved settings arrive', async () => {
		const wrapper = mountView({ mode: 'edit' });

		await wrapper.get('[data-testid="webhook-authentication"]').setValue('jwtAuth');
		await wrapper.setProps({ savedSettings: { authentication: 'headerAuth' } });

		expect(wrapper.vm.currentSettings).toEqual({ authentication: 'jwtAuth' });
	});

	it.each(['setup', 'edit'] as const)(
		'shows API instructions for the selected authentication in %s mode',
		async (mode) => {
			const wrapper = mountView({ mode });

			await wrapper.get('[data-testid="webhook-authentication"]').setValue('jwtAuth');

			const instructions = wrapper.getComponent(AgentChannelWebhookInstructions);
			expect(instructions.props('authentication')).toBe('jwtAuth');
		},
	);

	it('finishes the setup with Done', () => {
		const wrapper = mountView();

		expect(wrapper.get('[data-testid="webhook-connect"]').text()).toBe('generic.done');
	});

	it.each([
		['setup', 'webhook-endpoint-description'],
		['edit', 'webhook-url-hint'],
	] as const)('links to the Responses format in %s mode', async (mode, testId) => {
		getAgentWebhookUrl.mockResolvedValue({ url: 'https://n8n.example.com/agent-webhook/agent-1' });
		const wrapper = mountView({ mode });
		await flushPromises();

		const link = wrapper.get(`[data-testid="${testId}"] a`);
		expect(link.attributes('href')).toBe(
			'https://platform.openai.com/docs/api-reference/responses',
		);
		expect(link.attributes('target')).toBe('_blank');
	});

	it('shows the endpoint URL that the backend builds', async () => {
		getAgentWebhookUrl.mockResolvedValue({ url: 'https://n8n.example.com/agent-webhook/agent-1' });
		const wrapper = mountView();
		await flushPromises();

		expect(getAgentWebhookUrl).toHaveBeenCalledWith({}, 'project-1', 'agent-1');
		expect(wrapper.get('[data-testid="webhook-url"]').element).toHaveProperty(
			'value',
			'https://n8n.example.com/agent-webhook/agent-1/responses',
		);
	});

	it('shows the endpoint URL in edit mode', async () => {
		getAgentWebhookUrl.mockResolvedValue({ url: 'https://n8n.example.com/agent-webhook/agent-1' });
		const wrapper = mountView({ mode: 'edit', savedSettings: { authentication: 'none' } });

		expect(wrapper.find('[data-testid="webhook-url"]').exists()).toBe(false);
		await flushPromises();

		expect(wrapper.get('[data-testid="webhook-url"]').element).toHaveProperty(
			'value',
			'https://n8n.example.com/agent-webhook/agent-1/responses',
		);
	});
});
