import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import AgentChannelModal from '../components/AgentChannelModal.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

const catalog = ref([
	{ type: 'slack', label: 'Slack', icon: 'zap' },
	{ type: 'linear', label: 'Linear', icon: 'zap' },
	{ type: 'telegram', label: 'Telegram', icon: 'zap' },
]);

const integrationSettings = ref({
	slack: { accessMode: 'all' },
	linear: { accessMode: 'all' },
	telegram: { accessMode: 'all' },
});
const connectedCredentials = ref<Record<string, string>>({});
const selectedCredentials = ref<Record<string, string>>({});
const loadingMap = ref<Record<string, boolean>>({});
const fetchStatusMock = vi.fn().mockResolvedValue(undefined);
const connectMock = vi.fn(
	async (channelType: string, credentialId: string): Promise<{ status: string }> => {
		connectedCredentials.value[channelType] = credentialId;
		return { status: 'connected' };
	},
);
const disconnectMock = vi
	.fn()
	.mockImplementation(async (channelType: string, credentialId: string) => {
		if (connectedCredentials.value[channelType] === credentialId) {
			delete connectedCredentials.value[channelType];
		}
	});
const createCredentialMock = vi.fn();
const editCredentialMock = vi.fn();
const setupSlackAppMock = vi.fn().mockResolvedValue(true);
const vueErrorHandlerMock = vi.fn();

vi.mock('../composables/useAgentIntegrationsCatalog', () => ({
	useAgentIntegrationsCatalog: () => ({
		catalog,
		ensureLoaded: vi.fn().mockResolvedValue(catalog.value),
	}),
}));

vi.mock('../composables/useAgentIntegrationStatus', () => ({
	useAgentIntegrationStatus: () => ({
		fetchStatus: fetchStatusMock,
		connectedCredentials,
		integrationSettings,
		loadingMap,
		errorMessages: ref({}),
		errorIsConflict: ref({}),
		isConnected: () => false,
		isConfigured: (channelType: string) => Boolean(connectedCredentials.value[channelType]),
		connect: connectMock,
		disconnect: disconnectMock,
	}),
}));

vi.mock('../composables/useAgentChannelSetup', () => ({
	useAgentChannelSetup: () => ({
		channelSetupRef: ref(),
		selectedCredentials,
		credentialsLoading: ref(false),
		credentialPermissions: ref({}),
		credentialModalOpen: ref(false),
		getChannelCredentialId: (channelType: string | null | undefined) =>
			(channelType &&
				(selectedCredentials.value[channelType] || connectedCredentials.value[channelType])) ||
			'',
		getCredentials: (channelType: string) => [
			{ id: `${channelType}-credential`, name: `${channelType} credential` },
			{ id: `${channelType}-credential-new`, name: `New ${channelType} credential` },
		],
		loadChannelState: vi.fn().mockImplementation(async () => {
			for (const [channelType, credentialId] of Object.entries(connectedCredentials.value)) {
				if (!selectedCredentials.value[channelType]) {
					selectedCredentials.value[channelType] = credentialId;
				}
			}
		}),
		createCredential: createCredentialMock,
		editCredential: editCredentialMock,
		setupSlackApp: setupSlackAppMock,
	}),
}));

const channelSetupStub = (testId: string) => ({
	props: ['mode', 'loading', 'connectedDescription', 'setupSlackApp'],
	emits: ['connect'],
	setup: () => ({
		currentSettings: { accessMode: 'all' },
		validationError: null,
	}),
	template: `<div
		data-testid="${testId}"
		:data-mode="mode"
		:data-loading="loading"
		:data-connected-description="connectedDescription"
	>
		<button
			v-if="setupSlackApp"
			data-testid="${testId}-automatic-setup"
			@click="setupSlackApp('app-token')"
		/>
		<button data-testid="${testId}-connect" @click="$emit('connect')" />
	</div>`,
});

function mountModal(props: Record<string, unknown>) {
	return mount(AgentChannelModal, {
		props: {
			open: true,
			agentId: 'agent-1',
			projectId: 'project-1',
			view: 'linear_setup',
			...props,
		},
		global: {
			config: {
				errorHandler: vueErrorHandlerMock,
			},
			stubs: {
				// The N8nDialog family's SFCs don't set an explicit `defineOptions({ name })`,
				// so Vue infers the component name from the *filename* (Dialog.vue,
				// DialogHeader.vue, ...) rather than the `N8n`-prefixed name they're imported
				// under -- stubs must be keyed by that inferred name to be picked up.
				Dialog: {
					props: ['open', 'showCloseButton'],
					emits: ['update:open'],
					template:
						'<div v-if="open"><button v-if="showCloseButton" data-testid="close-dialog" @click="$emit(\'update:open\', false)" /><button data-testid="escape-dialog" @click="$emit(\'update:open\', false)" /><slot /></div>',
				},
				DialogHeader: { template: '<div><slot /></div>' },
				DialogTitle: { template: '<h3><slot /></h3>' },
				DialogFooter: { template: '<div><slot /></div>' },
				N8nButton: {
					emits: ['click'],
					template: '<button @click="$emit(\'click\')"><slot /></button>',
				},
				N8nIconButton: {
					emits: ['click'],
					template: '<button @click="$emit(\'click\')"><slot /></button>',
				},
				N8nIcon: { template: '<i />' },
				N8nText: { template: '<span><slot /></span>' },
				AgentChannelListItem: {
					props: ['configured', 'connected'],
					template:
						'<li data-testid="channel-list-item" :data-configured="configured" :data-connected="connected" />',
				},
				AgentChannelSlackSetup: channelSetupStub('slack-setup'),
				AgentChannelLinearSetup: channelSetupStub('linear-setup'),
				AgentChannelTelegramSetup: channelSetupStub('telegram-setup'),
				AgentIntegrationCredentialConnection: {
					props: ['integrationType', 'modelValue', 'disabled'],
					emits: ['update:modelValue', 'create', 'edit'],
					template: `
						<div
							data-testid="shared-credential-connection"
							:data-channel-type="integrationType"
							:data-credential-id="modelValue"
						>
							<button data-testid="change-credential" :disabled="disabled" @click="$emit('update:modelValue', integrationType + '-credential-new')" />
							<button data-testid="edit-credential" @click="$emit('edit')" />
						</div>
					`,
				},
			},
		},
	});
}

describe('AgentChannelModal', () => {
	beforeEach(() => {
		connectedCredentials.value = {};
		selectedCredentials.value = {};
		loadingMap.value = {};
		vi.clearAllMocks();
	});

	it('renders the channel list for the list view', () => {
		const wrapper = mountModal({ view: 'list' });

		expect(wrapper.findAll('[data-testid="channel-list-item"]')).toHaveLength(catalog.value.length);
	});

	it('does not describe a configured draft channel as connected', async () => {
		connectedCredentials.value.linear = 'linear-credential';
		const wrapper = mountModal({ view: 'linear_setup' });
		await flushPromises();

		expect(
			wrapper.get('[data-testid="linear-setup"]').attributes('data-connected-description'),
		).toBe('');
	});

	it('renders the per-channel setup view for a setup view', () => {
		const wrapper = mountModal({ view: 'linear_setup' });

		const linearSetup = wrapper.find('[data-testid="linear-setup"]');
		expect(linearSetup.attributes('data-mode')).toBe('setup');
	});

	it('waits for a pending agent to persist before saving a channel configuration', async () => {
		let finishPersisting = () => {};
		const persisting = new Promise<void>((resolve) => {
			finishPersisting = resolve;
		});
		selectedCredentials.value.linear = 'linear-credential';
		const wrapper = mountModal({
			view: 'linear_setup',
			ensureAgentPersisted: async () => await persisting,
		});

		await wrapper.get('[data-testid="linear-setup-connect"]').trigger('click');
		await flushPromises();

		expect(connectMock).not.toHaveBeenCalled();

		finishPersisting();
		await flushPromises();

		expect(connectMock).toHaveBeenCalledWith('linear', 'linear-credential', {
			accessMode: 'all',
		});
	});

	it('waits for a pending agent to persist before starting Slack app setup', async () => {
		let finishPersisting = () => {};
		const persisting = new Promise<void>((resolve) => {
			finishPersisting = resolve;
		});
		const wrapper = mountModal({
			view: 'slack_setup',
			ensureAgentPersisted: async () => await persisting,
		});

		await wrapper.get('[data-testid="slack-setup-automatic-setup"]').trigger('click');
		await flushPromises();

		expect(setupSlackAppMock).not.toHaveBeenCalled();

		finishPersisting();
		await flushPromises();

		expect(setupSlackAppMock).toHaveBeenCalledWith('app-token', expect.any(Function));
	});

	it('renders the per-channel edit view for an edit view', () => {
		const wrapper = mountModal({ view: 'linear_edit' });

		const linearSetup = wrapper.find('[data-testid="linear-setup"]');
		expect(linearSetup.attributes('data-mode')).toBe('edit');
	});

	it.each(['slack', 'linear', 'telegram'])(
		'renders the configured credential and edit action for the %s edit view',
		async (channelType) => {
			connectedCredentials.value[channelType] = `${channelType}-credential`;
			const wrapper = mountModal({
				view: `${channelType}_edit`,
			});
			await flushPromises();

			const credentialConnection = wrapper.get('[data-testid="shared-credential-connection"]');
			expect(credentialConnection.attributes('data-channel-type')).toBe(channelType);
			expect(credentialConnection.attributes('data-credential-id')).toBe(
				`${channelType}-credential`,
			);

			await credentialConnection.get('[data-testid="edit-credential"]').trigger('click');
			expect(editCredentialMock).toHaveBeenCalledOnce();
		},
	);

	it.each(['slack', 'linear', 'telegram'])(
		'removes the exact %s channel binding and closes the modal',
		async (channelType) => {
			connectedCredentials.value[channelType] = `${channelType}-credential`;
			const wrapper = mountModal({
				view: `${channelType}_edit`,
			});
			await flushPromises();

			await wrapper.get('[data-testid="agent-channel-remove-channel"]').trigger('click');
			await flushPromises();

			expect(disconnectMock).toHaveBeenCalledWith(channelType, `${channelType}-credential`);
			expect(fetchStatusMock).toHaveBeenCalledWith([channelType]);
			expect(connectMock).not.toHaveBeenCalled();
			expect(createCredentialMock).not.toHaveBeenCalled();
			expect(wrapper.emitted('channel-disconnected')).toEqual([[channelType]]);
			expect(wrapper.emitted('agent-changed')).toHaveLength(1);
			expect(wrapper.emitted('update:open')).toEqual([[false]]);
		},
	);

	it('keeps the channel listed when another binding of the same type remains', async () => {
		connectedCredentials.value.linear = 'linear-credential';
		disconnectMock.mockImplementationOnce(async () => {
			connectedCredentials.value.linear = 'linear-credential-other';
		});
		const wrapper = mountModal({
			view: 'linear_edit',
		});
		await flushPromises();

		await wrapper.get('[data-testid="agent-channel-remove-channel"]').trigger('click');
		await flushPromises();

		expect(disconnectMock).toHaveBeenCalledWith('linear', 'linear-credential');
		expect(fetchStatusMock).toHaveBeenCalledWith(['linear']);
		expect(wrapper.emitted('channel-disconnected')).toBeUndefined();
		expect(wrapper.emitted('update:open')).toEqual([[false]]);
	});

	it('connects a replacement credential before detaching the original binding and refetching status', async () => {
		connectedCredentials.value.linear = 'linear-credential';
		const wrapper = mountModal({
			view: 'linear_edit',
		});
		await flushPromises();

		await wrapper.get('[data-testid="change-credential"]').trigger('click');
		await wrapper.get('[data-testid="agent-channel-save-channel-config"]').trigger('click');
		await flushPromises();

		expect(connectMock).toHaveBeenCalledWith('linear', 'linear-credential-new', {
			accessMode: 'all',
		});
		expect(disconnectMock).toHaveBeenCalledWith('linear', 'linear-credential');
		expect(fetchStatusMock).toHaveBeenCalledWith(['linear']);
		expect(connectMock.mock.invocationCallOrder[0]).toBeLessThan(
			disconnectMock.mock.invocationCallOrder[0],
		);
		expect(disconnectMock.mock.invocationCallOrder[0]).toBeLessThan(
			fetchStatusMock.mock.invocationCallOrder[0],
		);
	});

	it('finishes replacing the original binding if the view changes while connecting', async () => {
		connectedCredentials.value.linear = 'linear-credential';
		let finishConnect = () => {};
		const connectPending = new Promise<void>((resolve) => {
			finishConnect = resolve;
		});
		connectMock.mockImplementationOnce(async (channelType: string, credentialId: string) => {
			await connectPending;
			connectedCredentials.value[channelType] = credentialId;
			return { status: 'connected' };
		});
		const wrapper = mountModal({
			view: 'linear_edit',
		});
		await flushPromises();

		await wrapper.get('[data-testid="change-credential"]').trigger('click');
		await wrapper.get('[data-testid="agent-channel-save-channel-config"]').trigger('click');
		await wrapper.setProps({ view: 'list' });
		finishConnect();
		await flushPromises();

		expect(disconnectMock).toHaveBeenCalledWith('linear', 'linear-credential');
		expect(fetchStatusMock).toHaveBeenCalledWith(['linear']);
	});

	it('prevents the dialog from closing while a replacement is connecting', async () => {
		connectedCredentials.value.linear = 'linear-credential';
		let finishConnect = () => {};
		const connectPending = new Promise<void>((resolve) => {
			finishConnect = resolve;
		});
		connectMock.mockImplementationOnce(async (channelType: string, credentialId: string) => {
			loadingMap.value[channelType] = true;
			try {
				await connectPending;
				connectedCredentials.value[channelType] = credentialId;
				return { status: 'connected' };
			} finally {
				loadingMap.value[channelType] = false;
			}
		});
		const wrapper = mountModal({
			view: 'linear_edit',
		});
		await flushPromises();

		await wrapper.get('[data-testid="change-credential"]').trigger('click');
		await wrapper.get('[data-testid="agent-channel-save-channel-config"]').trigger('click');
		await flushPromises();
		expect(wrapper.find('[data-testid="close-dialog"]').exists()).toBe(false);
		await wrapper.get('[data-testid="escape-dialog"]').trigger('click');

		expect(wrapper.emitted('update:open')).toBeUndefined();

		finishConnect();
		await flushPromises();

		expect(disconnectMock).toHaveBeenCalledWith('linear', 'linear-credential');
		expect(wrapper.emitted('update:open')).toEqual([[false]]);
	});

	it('resets an unsaved credential change when the edit modal reopens', async () => {
		connectedCredentials.value.linear = 'linear-credential';
		const wrapper = mountModal({
			view: 'linear_edit',
		});
		await flushPromises();

		await wrapper.get('[data-testid="change-credential"]').trigger('click');
		expect(selectedCredentials.value.linear).toBe('linear-credential-new');

		await wrapper.setProps({ open: false });
		await wrapper.setProps({ open: true });
		await flushPromises();

		expect(
			wrapper.get('[data-testid="shared-credential-connection"]').attributes('data-credential-id'),
		).toBe('linear-credential');
	});

	it('keeps the original binding and modal open when connecting a replacement credential fails', async () => {
		connectedCredentials.value.linear = 'linear-credential';
		connectMock.mockRejectedValueOnce(new Error('Failed to connect replacement credential'));
		const wrapper = mountModal({
			view: 'linear_edit',
		});
		await flushPromises();

		await wrapper.get('[data-testid="change-credential"]').trigger('click');
		await wrapper.get('[data-testid="agent-channel-save-channel-config"]').trigger('click');
		await flushPromises();

		expect(connectMock).toHaveBeenCalledWith('linear', 'linear-credential-new', {
			accessMode: 'all',
		});
		expect(disconnectMock).not.toHaveBeenCalled();
		expect(fetchStatusMock).not.toHaveBeenCalled();
		expect(wrapper.emitted('update:open')).toBeUndefined();
		expect(vueErrorHandlerMock).toHaveBeenCalledWith(
			expect.objectContaining({ message: 'Failed to connect replacement credential' }),
			expect.anything(),
			expect.any(String),
		);
	});

	it('locks the replacement credential and retries detaching the original binding', async () => {
		connectedCredentials.value.linear = 'linear-credential';
		disconnectMock.mockRejectedValueOnce(new Error('Failed to detach original credential'));
		const wrapper = mountModal({
			view: 'linear_edit',
		});
		await flushPromises();

		await wrapper.get('[data-testid="change-credential"]').trigger('click');
		await wrapper.get('[data-testid="agent-channel-save-channel-config"]').trigger('click');
		await flushPromises();

		expect(connectMock).toHaveBeenCalledOnce();
		expect(disconnectMock).toHaveBeenCalledWith('linear', 'linear-credential');
		expect(wrapper.get('[data-testid="change-credential"]').attributes('disabled')).toBeDefined();
		expect(wrapper.get('[data-testid="linear-setup"]').attributes('data-loading')).toBe('true');
		expect(wrapper.get('[data-testid="agent-channel-save-channel-config"]').text()).toBe(
			'generic.retry',
		);
		expect(wrapper.get('[data-testid="agent-channel-credential-replacement-error"]').text()).toBe(
			'agents.channels.modal.credentialReplacementError',
		);

		await wrapper.get('[data-testid="agent-channel-save-channel-config"]').trigger('click');
		await flushPromises();

		expect(connectMock).toHaveBeenCalledOnce();
		expect(disconnectMock).toHaveBeenCalledTimes(2);
		expect(disconnectMock).toHaveBeenLastCalledWith('linear', 'linear-credential');
		expect(fetchStatusMock).toHaveBeenCalledWith(['linear']);
		expect(wrapper.emitted('update:open')).toEqual([[false]]);
	});

	it('allows the modal to close and reopen after detaching the original binding fails', async () => {
		connectedCredentials.value.linear = 'linear-credential';
		disconnectMock.mockRejectedValueOnce(new Error('Failed to detach original credential'));
		const wrapper = mountModal({
			view: 'linear_edit',
		});
		await flushPromises();

		await wrapper.get('[data-testid="change-credential"]').trigger('click');
		await wrapper.get('[data-testid="agent-channel-save-channel-config"]').trigger('click');
		await flushPromises();

		expect(wrapper.get('[data-testid="agent-channel-credential-replacement-error"]').text()).toBe(
			'agents.channels.modal.credentialReplacementError',
		);
		await wrapper.get('[data-testid="close-dialog"]').trigger('click');

		expect(wrapper.emitted('update:open')).toEqual([[false]]);

		await wrapper.setProps({ open: false });
		await wrapper.setProps({ open: true });
		await flushPromises();

		expect(
			wrapper.find('[data-testid="agent-channel-credential-replacement-error"]').exists(),
		).toBe(false);
		expect(wrapper.find('[data-testid="close-dialog"]').exists()).toBe(true);
		expect(wrapper.get('[data-testid="agent-channel-save-channel-config"]').text()).toBe(
			'generic.save',
		);
	});

	it('saves settings without disconnecting when the credential is unchanged', async () => {
		connectedCredentials.value.telegram = 'telegram-credential';
		const wrapper = mountModal({
			view: 'telegram_edit',
		});
		await flushPromises();

		await wrapper.get('[data-testid="agent-channel-save-channel-config"]').trigger('click');
		await flushPromises();

		expect(connectMock).toHaveBeenCalledWith('telegram', 'telegram-credential', {
			accessMode: 'all',
		});
		expect(disconnectMock).not.toHaveBeenCalled();
		expect(wrapper.emitted('channel-connected')).toEqual([['telegram']]);
		expect(wrapper.emitted('agent-changed')).toHaveLength(1);
		expect(wrapper.emitted('update:open')).toEqual([[false]]);
	});
});
