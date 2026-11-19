import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { describe, expect, it } from 'vitest';

import AgentChannelStandardEditView from './AgentChannelStandardEditView.vue';

const props = {
	mode: 'edit' as const,
	integration: {
		type: 'whatsapp',
		label: 'WhatsApp',
		icon: 'whatsapp',
		credentialTypes: ['whatsAppBotApi'],
	},
	modelValue: 'cred-1',
	credentials: [],
	credentialPermissions: {},
	credentialsLoading: false,
	loading: false,
	connected: true,
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
	detailsComponent: { template: '<div data-testid="details" />' },
};

function mountView(slots: Record<string, string> = {}) {
	return mount(AgentChannelStandardEditView, {
		props,
		slots,
		global: {
			stubs: {
				AgentIntegrationCredentialConnection: {
					template: '<div data-testid="credential-connection" />',
				},
			},
		},
	});
}

describe('AgentChannelStandardEditView', () => {
	it('shows the top slot above the credential and the details', () => {
		const wrapper = mountView({ top: '<div data-testid="top-notice">Notice</div>' });

		const order = wrapper
			.findAll('[data-testid]')
			.map((element) => element.attributes('data-testid'));
		expect(order).toEqual(['top-notice', 'credential-connection', 'details']);
	});

	it('shows only the credential and the details when there is no top slot', () => {
		const wrapper = mountView();

		const order = wrapper
			.findAll('[data-testid]')
			.map((element) => element.attributes('data-testid'));
		expect(order).toEqual(['credential-connection', 'details']);
	});
});
