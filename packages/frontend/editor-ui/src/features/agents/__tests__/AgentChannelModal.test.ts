import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AgentChannelModal, { type ChannelView } from '../components/AgentChannelModal.vue';

const mocks = vi.hoisted(() => ({
	connect: vi.fn(),
	disconnect: vi.fn(),
	fetchStatus: vi.fn(),
	beforeSave: vi.fn(),
	showMessage: vi.fn(),
	showError: vi.fn(),
}));

const catalog = ref([
	{
		type: 'example',
		label: 'Example',
		icon: 'zap',
		credentialTypes: ['exampleApi'],
	},
]);
const connectedCredentials = ref<Record<string, string>>({});
const selectedCredentials = ref<Record<string, string>>({});
const loadingMap = ref<Record<string, boolean>>({});

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage: mocks.showMessage, showError: mocks.showError }),
}));

vi.mock('../channels/registry', () => {
	const platformView = {
		props: ['modelValue', 'mode'],
		emits: ['update:modelValue', 'connect'],
		setup: () => ({
			currentSettings: { accessMode: 'all' },
			validationError: null,
			beforeSave: mocks.beforeSave,
		}),
		template: `
			<div data-testid="platform-view" :data-mode="mode">
				<button data-testid="select-credential" @click="$emit('update:modelValue', 'credential-new')" />
				<button data-testid="connect-channel" @click="$emit('connect')" />
			</div>
		`,
	};
	const platform = {
		type: 'example',
		setupComponent: platformView,
		editComponent: platformView,
		getConnectAction: () => ({ label: 'Connect example', icon: 'zap' }),
		presentDisconnectWarning: (warning: { code: string }) =>
			warning.code === 'cleanup_incomplete'
				? { title: 'Cleanup incomplete', message: 'Open provider settings' }
				: null,
	};
	const runtime = {
		loading: { value: false },
		load: vi.fn().mockResolvedValue(undefined),
	};
	return {
		agentChannelPlatforms: { example: platform },
		getAgentChannelPlatform: () => platform,
		createAgentChannelRuntime: () => runtime,
	};
});

vi.mock('../composables/useAgentIntegrationsCatalog', () => ({
	useAgentIntegrationsCatalog: () => ({
		catalog,
		ensureLoaded: vi.fn().mockResolvedValue(catalog.value),
	}),
}));

vi.mock('../composables/useAgentIntegrationStatus', () => ({
	useAgentIntegrationStatus: () => ({
		fetchStatus: mocks.fetchStatus,
		connectedCredentials,
		integrationSettings: ref({ example: { accessMode: 'all' } }),
		loadingMap,
		errorMessages: ref({}),
		errorIsConflict: ref({}),
		isConnected: (type: string) => Boolean(connectedCredentials.value[type]),
		connect: mocks.connect,
		disconnect: mocks.disconnect,
	}),
}));

vi.mock('../composables/useAgentChannelSetup', () => ({
	useAgentChannelSetup: () => ({
		selectedCredentials,
		credentialsLoading: ref(false),
		credentialPermissions: ref({ create: true }),
		credentialModalOpen: ref(false),
		getChannelCredentialId: (type?: string | null) =>
			type ? (selectedCredentials.value[type] ?? connectedCredentials.value[type] ?? '') : '',
		getCredentials: () => [
			{ id: 'credential-old', name: 'Old credential' },
			{ id: 'credential-new', name: 'New credential' },
		],
		loadChannelState: vi.fn().mockResolvedValue(undefined),
		createCredential: vi.fn(),
		editCredential: vi.fn(),
	}),
}));

function mountModal(view: ChannelView = 'example_setup') {
	return mount(AgentChannelModal, {
		props: {
			open: true,
			agentId: 'agent-1',
			projectId: 'project-1',
			view,
			connectedChannels: Object.keys(connectedCredentials.value),
			isPublished: false,
		},
		global: {
			stubs: {
				Dialog: {
					props: ['open', 'showCloseButton'],
					emits: ['update:open'],
					template:
						'<div v-if="open"><button data-testid="close-dialog" @click="$emit(\'update:open\', false)" /><slot /></div>',
				},
				DialogHeader: { template: '<div><slot /></div>' },
				DialogTitle: { template: '<h3><slot /></h3>' },
				DialogFooter: { template: '<div><slot /></div>' },
				N8nButton: {
					props: ['disabled'],
					emits: ['click'],
					template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
				},
				N8nIconButton: { template: '<button><slot /></button>' },
				N8nIcon: { template: '<i />' },
				N8nText: { template: '<span><slot /></span>' },
				AgentChannelListItem: {
					props: ['integration', 'connectAction'],
					emits: ['setup'],
					template:
						'<li data-testid="channel-list-item" :data-action="connectAction.label"><button @click="$emit(\'setup\', integration.type)" /></li>',
				},
			},
		},
	});
}

describe('AgentChannelModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		connectedCredentials.value = {};
		selectedCredentials.value = {};
		loadingMap.value = {};
		mocks.connect.mockImplementation(async (type: string, credentialId: string) => {
			connectedCredentials.value[type] = credentialId;
			return { status: 'connected' };
		});
		mocks.disconnect.mockResolvedValue({ status: 'disconnected' });
		mocks.fetchStatus.mockResolvedValue(undefined);
		mocks.beforeSave.mockResolvedValue(undefined);
	});

	it('uses registry metadata and setup rendering without platform checks', async () => {
		const list = mountModal('list');
		await flushPromises();
		expect(list.get('[data-testid="channel-list-item"]').attributes('data-action')).toBe(
			'Connect example',
		);

		const setup = mountModal();
		expect(setup.get('[data-testid="platform-view"]').attributes('data-mode')).toBe('setup');
	});

	it('delegates beforeSave and settings to the platform view', async () => {
		selectedCredentials.value.example = 'credential-new';
		const wrapper = mountModal();

		await wrapper.get('[data-testid="connect-channel"]').trigger('click');
		await flushPromises();

		expect(mocks.beforeSave).toHaveBeenCalledOnce();
		expect(mocks.connect).toHaveBeenCalledWith('example', 'credential-new', {
			accessMode: 'all',
		});
	});

	it('connects a replacement before disconnecting the original credential', async () => {
		connectedCredentials.value.example = 'credential-old';
		const wrapper = mountModal('example_edit');
		await flushPromises();

		await wrapper.get('[data-testid="select-credential"]').trigger('click');
		await wrapper.get('[data-testid="agent-channel-save-channel-config"]').trigger('click');
		await flushPromises();

		expect(mocks.connect).toHaveBeenCalledWith('example', 'credential-new', {
			accessMode: 'all',
		});
		expect(mocks.disconnect).toHaveBeenCalledWith('example', 'credential-old');
		expect(mocks.connect.mock.invocationCallOrder[0]).toBeLessThan(
			mocks.disconnect.mock.invocationCallOrder[0],
		);
	});

	it('keeps the dialog locked while credential replacement is in flight', async () => {
		connectedCredentials.value.example = 'credential-old';
		let finishConnect = () => {};
		mocks.connect.mockImplementationOnce(async () => {
			loadingMap.value.example = true;
			const result = await new Promise<{ status: string }>((resolve) => {
				finishConnect = () => resolve({ status: 'connected' });
			});
			loadingMap.value.example = false;
			return result;
		});
		const wrapper = mountModal('example_edit');
		await flushPromises();
		await wrapper.get('[data-testid="select-credential"]').trigger('click');
		await wrapper.get('[data-testid="agent-channel-save-channel-config"]').trigger('click');

		await wrapper.get('[data-testid="close-dialog"]').trigger('click');
		expect(wrapper.emitted('update:open')).toBeUndefined();

		finishConnect();
		await flushPromises();
	});

	it('delegates generic disconnect warning presentation to the platform', async () => {
		connectedCredentials.value.example = 'credential-old';
		mocks.disconnect.mockResolvedValueOnce({
			status: 'disconnected',
			warning: {
				integrationType: 'example',
				code: 'cleanup_incomplete',
				action: { type: 'open_url', url: 'https://example.test/settings' },
			},
		});
		const wrapper = mountModal('example_edit');
		await flushPromises();

		await wrapper.get('[data-testid="agent-channel-remove-channel"]').trigger('click');
		await flushPromises();

		expect(mocks.showMessage).toHaveBeenCalledWith({
			type: 'warning',
			title: 'Cleanup incomplete',
			message: 'Open provider settings',
			duration: 0,
		});
	});
});
