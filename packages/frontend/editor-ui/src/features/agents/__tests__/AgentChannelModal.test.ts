import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AgentChannelModal, { type ChannelView } from '../components/AgentChannelModal.vue';

const mocks = vi.hoisted(() => ({
	connect: vi.fn(),
	disconnect: vi.fn(),
	fetchStatus: vi.fn(),
	beforeSave: vi.fn(),
	ensureAgentPersisted: vi.fn(),
}));

const catalog = ref([
	{
		type: 'example',
		label: 'Example',
		icon: 'zap',
		credentialTypes: ['exampleApi'],
	},
]);
const statuses = ref<Record<string, 'configured' | 'connected' | 'disconnected'>>({});
const connectedCredentials = ref<Record<string, string>>({});
const selectedCredentials = ref<Record<string, string>>({});
const loadingMap = ref<Record<string, boolean>>({});

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('../channels/registry', () => {
	const platformView = {
		props: ['modelValue', 'mode', 'isPublished'],
		emits: ['update:modelValue', 'connect'],
		setup: () => ({
			currentSettings: { accessMode: 'all' },
			validationError: null,
			beforeSave: mocks.beforeSave,
		}),
		template: `
			<div
				data-testid="platform-view"
				:data-mode="mode"
				:data-published="isPublished"
			>
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
		getConnectedDescription: () => 'Example connected',
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
		isConnected: (type: string) => statuses.value[type] === 'connected',
		isConfigured: (type: string) =>
			['configured', 'connected'].includes(statuses.value[type] ?? 'disconnected'),
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

function mountModal(view: ChannelView = 'example_setup', isPublished = false) {
	return mount(AgentChannelModal, {
		props: {
			open: true,
			agentId: 'agent-1',
			projectId: 'project-1',
			view,
			isPublished,
			ensureAgentPersisted: mocks.ensureAgentPersisted,
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
					props: ['integration', 'configured', 'connected', 'connectAction'],
					emits: ['setup'],
					template: `
						<li
							data-testid="channel-list-item"
							:data-action="connectAction.label"
							:data-configured="configured"
							:data-connected="connected"
						>
							<button @click="$emit('setup', integration.type)" />
						</li>
					`,
				},
			},
		},
	});
}

describe('AgentChannelModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		statuses.value = {};
		connectedCredentials.value = {};
		selectedCredentials.value = {};
		loadingMap.value = {};
		mocks.connect.mockImplementation(async (type: string, credentialId: string) => {
			statuses.value[type] = 'connected';
			connectedCredentials.value[type] = credentialId;
			return { status: 'connected' };
		});
		mocks.disconnect.mockImplementation(async (type: string) => {
			statuses.value[type] = 'disconnected';
			delete connectedCredentials.value[type];
			return { status: 'disconnected' };
		});
		mocks.fetchStatus.mockResolvedValue(undefined);
		mocks.beforeSave.mockResolvedValue(undefined);
		mocks.ensureAgentPersisted.mockResolvedValue(undefined);
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

	it('presents configured and connected as distinct list states', async () => {
		statuses.value.example = 'configured';
		const configured = mountModal('list');
		await flushPromises();
		expect(configured.get('[data-testid="channel-list-item"]').attributes()).toMatchObject({
			'data-configured': 'true',
			'data-connected': 'false',
		});

		statuses.value.example = 'connected';
		await configured.vm.$nextTick();
		expect(configured.get('[data-testid="channel-list-item"]').attributes('data-connected')).toBe(
			'true',
		);
	});

	it('forwards publication state and persists before platform save', async () => {
		selectedCredentials.value.example = 'credential-new';
		const wrapper = mountModal('example_setup', true);

		expect(wrapper.get('[data-testid="platform-view"]').attributes('data-published')).toBe('true');
		await wrapper.get('[data-testid="connect-channel"]').trigger('click');
		await flushPromises();

		expect(mocks.ensureAgentPersisted).toHaveBeenCalledOnce();
		expect(mocks.beforeSave).toHaveBeenCalledOnce();
		expect(mocks.connect).toHaveBeenCalledWith('example', 'credential-new', {
			accessMode: 'all',
		});
		expect(mocks.ensureAgentPersisted.mock.invocationCallOrder[0]).toBeLessThan(
			mocks.connect.mock.invocationCallOrder[0],
		);
		expect(wrapper.emitted('agent-changed')).toHaveLength(1);
	});

	it('connects a replacement before disconnecting the original credential', async () => {
		statuses.value.example = 'connected';
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
});
