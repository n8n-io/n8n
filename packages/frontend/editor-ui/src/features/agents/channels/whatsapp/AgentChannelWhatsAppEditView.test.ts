import { flushPromises, mount } from '@vue/test-utils';
import { computed, ref, type Ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WhatsAppMetaStatus } from '@n8n/api-types';

import AgentChannelWhatsAppEditView from './AgentChannelWhatsAppEditView.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const { metaStatus, useMetaStatusSpy } = vi.hoisted(() => ({
	metaStatus: { value: null as WhatsAppMetaStatus | null },
	useMetaStatusSpy: vi.fn(),
}));

vi.mock('./useWhatsAppMetaStatus', () => ({
	useWhatsAppMetaStatus: (...args: unknown[]) => {
		useMetaStatusSpy(...args);
		return { status: computed(() => metaStatus.value), refresh: vi.fn() };
	},
}));

const baseProps = {
	mode: 'edit' as const,
	modelValue: 'cred-1',
	savedCredentialId: 'cred-1',
	integration: {
		type: 'whatsapp',
		label: 'WhatsApp',
		icon: 'whatsapp',
		credentialTypes: ['whatsAppBotApi'],
	},
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
};

function mountView(props: Record<string, unknown> = {}) {
	return mount(AgentChannelWhatsAppEditView, {
		props: { ...baseProps, ...props },
		global: {
			stubs: {
				AgentIntegrationCredentialConnection: {
					template: '<div data-testid="credential-connection" />',
				},
				AgentChannelWhatsAppSetup: { template: '<div data-testid="whatsapp-details" />' },
				AgentChannelWhatsAppMetaCallout: {
					props: ['status'],
					template: '<div data-testid="meta-callout">{{ status?.state }}</div>',
				},
			},
		},
	});
}

/** The credential id that the view asked the status for. */
function askedCredential(): string | undefined {
	const credential = useMetaStatusSpy.mock.calls.at(-1)?.[2] as Ref<string | undefined>;
	return credential.value;
}

describe('AgentChannelWhatsAppEditView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		metaStatus.value = null;
	});

	it('shows the Meta callout above the credential', async () => {
		metaStatus.value = { state: 'dailyLimit' };

		const wrapper = mountView();
		await flushPromises();

		const callout = wrapper.get('[data-testid="meta-callout"]').element;
		const credential = wrapper.get('[data-testid="credential-connection"]').element;
		expect(callout.textContent).toBe('dailyLimit');
		expect(
			callout.compareDocumentPosition(credential) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it('keeps the credential and the details below the callout', async () => {
		const wrapper = mountView();
		await flushPromises();

		expect(wrapper.find('[data-testid="credential-connection"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="whatsapp-details"]').exists()).toBe(true);
	});

	it('asks for the Meta status of the connected credential', () => {
		mountView({ connected: true, modelValue: 'cred-1', savedCredentialId: 'cred-1' });

		expect(askedCredential()).toBe('cred-1');
		expect(
			useMetaStatusSpy.mock.calls
				.at(-1)
				?.slice(0, 2)
				.map((ref) => (ref as Ref<string>).value),
		).toEqual(['project-1', 'agent-1']);
	});

	it('does not ask for the Meta status before the channel is connected', () => {
		mountView({ connected: false, modelValue: 'cred-1' });

		expect(askedCredential()).toBeUndefined();
	});

	it('keeps showing the status of the connected credential when another one is picked', async () => {
		const wrapper = mountView({ connected: true, modelValue: 'cred-1' });
		await flushPromises();

		await wrapper.setProps({ modelValue: 'cred-2' });
		await flushPromises();

		expect(askedCredential()).toBe('cred-1');
	});

	it('asks for the status once the channel becomes connected', async () => {
		const wrapper = mountView({ connected: false, modelValue: 'cred-1' });
		await flushPromises();
		expect(askedCredential()).toBeUndefined();

		await wrapper.setProps({ connected: true });
		await flushPromises();

		expect(askedCredential()).toBe('cred-1');
	});

	it('asks for the status of the new credential once a credential swap is saved', async () => {
		const wrapper = mountView({
			connected: true,
			modelValue: 'cred-1',
			savedCredentialId: 'cred-1',
		});
		await flushPromises();

		await wrapper.setProps({ modelValue: 'cred-2', savedCredentialId: 'cred-2' });
		await flushPromises();

		expect(askedCredential()).toBe('cred-2');
	});
});
