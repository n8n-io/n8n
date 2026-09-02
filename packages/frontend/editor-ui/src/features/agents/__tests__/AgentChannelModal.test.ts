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
	clearError: vi.fn(),
	showMessage: vi.fn(),
	showError: vi.fn(),
}));

const exampleIntegration = {
	type: 'example',
	label: 'Example',
	icon: 'zap',
	credentialTypes: ['exampleApi'],
};
const catalog = ref([exampleIntegration]);
const slackIntegration = {
	type: 'slack',
	label: 'Slack',
	icon: 'slack',
	credentialTypes: ['slackApi'],
};
const statuses = ref<
	Record<string, 'configured' | 'starting' | 'connected' | 'error' | 'disconnected'>
>({});
const connectedCredentials = ref<Record<string, string>>({});
const selectedCredentials = ref<Record<string, string>>({});
const loadingMap = ref<Record<string, boolean>>({});
const runtimeErrors = ref<Record<string, string>>({});
const credentialModalOpen = ref(false);

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage: mocks.showMessage, showError: mocks.showError }),
}));

vi.mock('../channels/registry', async () => {
	const { ref, defineComponent } = await import('vue');
	const platformView = {
		props: ['modelValue', 'mode', 'isPublished', 'runtime'],
		emits: ['update:modelValue', 'connect', 'connected'],
		setup: () => {
			// Platforms that drive their own flow (Slack) report `connected` while
			// still reporting `loading`, so the two are controlled together here.
			const loading = ref(false);
			return {
				currentSettings: { accessMode: 'all' },
				validationError: null,
				beforeSave: mocks.beforeSave,
				loading,
				startOwnFlow: () => {
					loading.value = true;
				},
			};
		},
		template: `
			<div
				data-testid="platform-view"
				:data-mode="mode"
				:data-published="isPublished"
				:data-setup-kind="runtime.setupKind?.value"
			>
				<button data-testid="select-credential" @click="$emit('update:modelValue', 'credential-new')" />
				<button data-testid="connect-channel" @click="$emit('connect')" />
				<button data-testid="platform-own-flow" @click="startOwnFlow(); $emit('connected')" />
			</div>
		`,
	};
	const disconnectConfirmation = {
		props: ['open', 'loading'],
		emits: ['cancel', 'confirm'],
		template: `
			<div v-if="open" data-testid="disconnect-confirmation">
				<button data-testid="confirm-keep-app" @click="$emit('confirm', false)" />
				<button data-testid="confirm-delete-app" @click="$emit('confirm', true)" />
			</div>
		`,
	};
	const slackHeaderContent = defineComponent({
		props: ['runtime', 'disabled'],
		template: `
			<select
				data-testid="slack-setup-kind-selector"
				:disabled="disabled"
				@change="runtime.setupKind.value = $event.target.value"
			>
				<option value="managed">agents.channels.slack.setupKind.recommended</option>
				<option value="manual">agents.channels.slack.setupKind.manual</option>
			</select>
		`,
	});
	const basePlatform = {
		setupComponent: platformView,
		editComponent: platformView,
		disconnectConfirmationComponent: disconnectConfirmation,
		shouldConfirmDisconnect: (
			_runtime: unknown,
			credentialId: string,
			{ isPublished }: { isPublished: boolean },
		) => isPublished && credentialId === 'credential-managed',
		getConnectAction: () => ({ label: 'Connect example', icon: 'zap' }),
		getConnectedDescription: () => 'Example connected',
		presentDisconnectWarning: (warning: { code: string }) =>
			warning.code === 'cleanup_incomplete'
				? { title: 'Cleanup incomplete', message: 'Open provider settings' }
				: null,
	};
	const examplePlatform = { ...basePlatform, type: 'example' };
	const slackPlatform = {
		...basePlatform,
		type: 'slack',
		headerContent: { setupModal: slackHeaderContent },
	};
	const runtime = {
		loading: ref(false),
		load: vi.fn().mockResolvedValue(undefined),
		setup: ref({ managedSetupAvailable: true, managerCredentials: [] }),
		setupKind: ref<'managed' | 'manual'>('managed'),
	};
	return {
		agentChannelPlatforms: { example: examplePlatform, slack: slackPlatform },
		getAgentChannelPlatform: (type: string) => (type === 'slack' ? slackPlatform : examplePlatform),
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
		runtimeErrors,
		isConnected: (type: string) => statuses.value[type] === 'connected',
		isConfigured: (type: string) =>
			['configured', 'starting', 'connected', 'error'].includes(
				statuses.value[type] ?? 'disconnected',
			),
		hasRuntimeError: (type: string) => statuses.value[type] === 'error',
		isStarting: (type: string) => statuses.value[type] === 'starting',
		connect: mocks.connect,
		disconnect: mocks.disconnect,
		clearError: mocks.clearError,
	}),
}));

vi.mock('../composables/useAgentChannelSetup', () => ({
	useAgentChannelSetup: () => ({
		selectedCredentials,
		credentialsLoading: ref(false),
		credentialPermissions: ref({ create: true }),
		credentialModalOpen,
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
					emits: ['update:open', 'interactOutside'],
					methods: {
						// Mirrors reka-ui's own DismissableLayer: an outside click fires
						// `interact-outside` first, and only dismisses if that event
						// wasn't prevented.
						clickOutside() {
							const event = new Event('interact-outside', { cancelable: true });
							this.$emit('interactOutside', event);
							if (!event.defaultPrevented) this.$emit('update:open', false);
						},
					},
					template:
						'<div v-if="open"><button data-testid="close-dialog" @click="$emit(\'update:open\', false)" /><button data-testid="click-outside" @click="clickOutside" /><slot /></div>',
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
					props: [
						'integration',
						'configured',
						'connected',
						'notRunning',
						'runtimeError',
						'connectAction',
					],
					emits: ['setup', 'disconnect'],
					template: `
						<li
							data-testid="channel-list-item"
							:data-action="connectAction.label"
							:data-configured="configured"
							:data-connected="connected"
							:data-not-running="notRunning"
							:data-runtime-error="runtimeError"
						>
							<button data-testid="setup-channel" @click="$emit('setup', integration.type)" />
							<button data-testid="disconnect-channel" @click="$emit('disconnect', integration.type)" />
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
		catalog.value = [exampleIntegration];
		statuses.value = {};
		connectedCredentials.value = {};
		selectedCredentials.value = {};
		loadingMap.value = {};
		runtimeErrors.value = {};
		credentialModalOpen.value = false;
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

	it('switches Slack setup kind from the modal header selector', async () => {
		catalog.value = [exampleIntegration, slackIntegration];
		const wrapper = mountModal('slack_setup');
		await flushPromises();

		const selector = wrapper.get('[data-testid="slack-setup-kind-selector"]');
		expect(selector.text()).toContain('agents.channels.slack.setupKind.recommended');
		expect(selector.text()).toContain('agents.channels.slack.setupKind.manual');

		await selector.setValue('manual');

		expect(wrapper.get('[data-testid="platform-view"]').attributes('data-setup-kind')).toBe(
			'manual',
		);
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

	it('shows a channel that failed to start as not running, with the reason', async () => {
		statuses.value.example = 'error';
		runtimeErrors.value.example = 'Credential cred-1 not found';
		const wrapper = mountModal('list');
		await flushPromises();

		expect(wrapper.get('[data-testid="channel-list-item"]').attributes()).toMatchObject({
			// Still set up, so the row keeps its Edit/Disconnect menu rather than
			// offering to connect a channel that already exists.
			'data-configured': 'true',
			'data-connected': 'false',
			'data-not-running': 'true',
			'data-runtime-error': 'Credential cred-1 not found',
		});
	});

	it('forwards publication state and persists before platform save', async () => {
		selectedCredentials.value.example = 'credential-new';
		const wrapper = mountModal('example_setup', true);

		expect(wrapper.get('[data-testid="platform-view"]').attributes('data-published')).toBe('true');
		await wrapper.get('[data-testid="connect-channel"]').trigger('click');
		await flushPromises();

		expect(mocks.ensureAgentPersisted).toHaveBeenCalledOnce();
		expect(mocks.beforeSave).toHaveBeenCalledOnce();
		expect(mocks.connect).toHaveBeenCalledWith(
			'example',
			'credential-new',
			{ accessMode: 'all' },
			{},
		);
		expect(mocks.ensureAgentPersisted.mock.invocationCallOrder[0]).toBeLessThan(
			mocks.connect.mock.invocationCallOrder[0],
		);
		expect(wrapper.emitted('agent-changed')).toHaveLength(1);
	});

	describe('while agent persistence is pending', () => {
		function deferPersistence() {
			let release: () => void = () => {};
			mocks.ensureAgentPersisted.mockImplementation(
				async () =>
					await new Promise<void>((resolve) => {
						release = resolve;
					}),
			);
			return () => release();
		}

		it('does not submit setup twice', async () => {
			const release = deferPersistence();
			selectedCredentials.value.example = 'credential-new';
			const wrapper = mountModal('example_setup');
			await flushPromises();

			await wrapper.get('[data-testid="connect-channel"]').trigger('click');
			await wrapper.get('[data-testid="connect-channel"]').trigger('click');
			await flushPromises();

			expect(mocks.ensureAgentPersisted).toHaveBeenCalledOnce();
			expect(mocks.connect).not.toHaveBeenCalled();

			release();
			await flushPromises();

			expect(mocks.connect).toHaveBeenCalledOnce();
		});

		it('keeps close, back and remove inert', async () => {
			const release = deferPersistence();
			statuses.value.example = 'configured';
			connectedCredentials.value.example = 'credential-old';
			selectedCredentials.value.example = 'credential-new';
			const wrapper = mountModal('example_edit');
			await flushPromises();

			await wrapper.get('[data-testid="agent-channel-save-channel-config"]').trigger('click');
			await flushPromises();

			await wrapper.get('[data-testid="close-dialog"]').trigger('click');
			expect(wrapper.emitted('update:open')).toBeUndefined();

			expect(
				wrapper.get('[data-testid="agent-channel-back"]').attributes('disabled'),
			).toBeDefined();

			await wrapper.get('[data-testid="agent-channel-remove-channel"]').trigger('click');
			expect(mocks.disconnect).not.toHaveBeenCalled();

			release();
			await flushPromises();

			expect(mocks.connect).toHaveBeenCalledOnce();
			expect(wrapper.emitted('update:open')).toEqual([[false]]);
		});

		it('surfaces a failed persistence instead of connecting', async () => {
			mocks.ensureAgentPersisted.mockRejectedValue(new Error('agent could not be saved'));
			selectedCredentials.value.example = 'credential-new';
			const wrapper = mountModal('example_setup');
			await flushPromises();

			await wrapper.get('[data-testid="connect-channel"]').trigger('click');
			await flushPromises();

			expect(mocks.showError).toHaveBeenCalled();
			expect(mocks.connect).not.toHaveBeenCalled();
			expect(wrapper.emitted('update:open')).toBeUndefined();
		});
	});

	describe('outside click', () => {
		it('closes the modal', async () => {
			const wrapper = mountModal('list');
			await flushPromises();

			await wrapper.get('[data-testid="click-outside"]').trigger('click');

			expect(wrapper.emitted('update:open')).toEqual([[false]]);
		});

		it('is ignored while the nested credential modal is open', async () => {
			credentialModalOpen.value = true;
			const wrapper = mountModal('list');
			await flushPromises();

			await wrapper.get('[data-testid="click-outside"]').trigger('click');

			expect(wrapper.emitted('update:open')).toBeUndefined();
		});

		it('is ignored while an action is in flight', async () => {
			let release: () => void = () => {};
			mocks.ensureAgentPersisted.mockImplementation(
				async () =>
					await new Promise<void>((resolve) => {
						release = resolve;
					}),
			);
			selectedCredentials.value.example = 'credential-new';
			const wrapper = mountModal('example_setup');
			await flushPromises();

			await wrapper.get('[data-testid="connect-channel"]').trigger('click');
			await wrapper.get('[data-testid="click-outside"]').trigger('click');

			expect(wrapper.emitted('update:open')).toBeUndefined();

			release();
			await flushPromises();
		});
	});

	it('surfaces a failed pre-save step instead of connecting', async () => {
		mocks.beforeSave.mockRejectedValue(new Error('settings could not be saved'));
		selectedCredentials.value.example = 'credential-new';
		const wrapper = mountModal('example_setup');
		await flushPromises();

		await wrapper.get('[data-testid="connect-channel"]').trigger('click');
		await flushPromises();

		expect(mocks.showError).toHaveBeenCalled();
		expect(mocks.connect).not.toHaveBeenCalled();
		expect(wrapper.emitted('update:open')).toBeUndefined();
	});

	it('closes when a platform reports connected from inside its own flow', async () => {
		const wrapper = mountModal('example_setup');
		await flushPromises();

		// The platform is still loading at this point — the in-flight guard covers
		// user-initiated closes only, so it must not swallow this one.
		await wrapper.get('[data-testid="platform-own-flow"]').trigger('click');
		await flushPromises();

		expect(wrapper.emitted('channel-connected')).toEqual([['example']]);
		expect(wrapper.emitted('update:open')).toEqual([[false]]);
	});

	it('clears a stale integration error when the edit modal reopens', async () => {
		connectedCredentials.value.example = 'credential-old';
		const wrapper = mountModal('example_edit');
		await flushPromises();
		mocks.clearError.mockClear();

		await wrapper.setProps({ open: false });
		await wrapper.setProps({ open: true });
		await flushPromises();

		expect(mocks.clearError).toHaveBeenCalledWith('example');
	});

	it('clears a stale integration error when the selected credential changes', async () => {
		connectedCredentials.value.example = 'credential-old';
		const wrapper = mountModal('example_edit');
		await flushPromises();
		mocks.clearError.mockClear();

		await wrapper.get('[data-testid="select-credential"]').trigger('click');

		expect(mocks.clearError).toHaveBeenCalledWith('example');
	});

	it('swaps a credential in one request instead of a follow-up disconnect', async () => {
		statuses.value.example = 'connected';
		connectedCredentials.value.example = 'credential-old';
		const wrapper = mountModal('example_edit');
		await flushPromises();

		await wrapper.get('[data-testid="select-credential"]').trigger('click');
		await wrapper.get('[data-testid="agent-channel-save-channel-config"]').trigger('click');
		await flushPromises();

		expect(mocks.connect).toHaveBeenCalledWith(
			'example',
			'credential-new',
			{ accessMode: 'all' },
			{ replaces: { credentialId: 'credential-old' } },
		);
		// The backend releases the old channel once the swap is durable, so the
		// modal must not issue a disconnect that could strand it.
		expect(mocks.disconnect).not.toHaveBeenCalled();
	});

	it('delegates disconnect warning presentation to the platform', async () => {
		statuses.value.example = 'connected';
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
		expect(wrapper.emitted('agent-changed')).toHaveLength(1);
	});

	it('confirms managed removal from the edit view and keeps the Slack app when unchecked', async () => {
		statuses.value.example = 'configured';
		connectedCredentials.value.example = 'credential-managed';
		const wrapper = mountModal('example_edit', true);
		await flushPromises();

		await wrapper.get('[data-testid="agent-channel-remove-channel"]').trigger('click');
		expect(mocks.disconnect).not.toHaveBeenCalled();

		await wrapper.get('[data-testid="confirm-keep-app"]').trigger('click');
		await flushPromises();

		expect(mocks.disconnect).toHaveBeenCalledWith('example', 'credential-managed', {
			deleteExternalResource: false,
		});
	});

	it('uses the same managed removal confirmation from the list menu', async () => {
		statuses.value.example = 'connected';
		connectedCredentials.value.example = 'credential-managed';
		const wrapper = mountModal('list', true);
		await flushPromises();

		await wrapper.get('[data-testid="disconnect-channel"]').trigger('click');
		expect(mocks.disconnect).not.toHaveBeenCalled();

		await wrapper.get('[data-testid="confirm-delete-app"]').trigger('click');
		await flushPromises();

		expect(mocks.disconnect).toHaveBeenCalledWith('example', 'credential-managed', {
			deleteExternalResource: true,
		});
	});

	it('disconnects managed credentials without confirmation when the agent is unpublished', async () => {
		statuses.value.example = 'configured';
		connectedCredentials.value.example = 'credential-managed';
		const wrapper = mountModal('example_edit');
		await flushPromises();

		await wrapper.get('[data-testid="agent-channel-remove-channel"]').trigger('click');
		await flushPromises();

		expect(wrapper.find('[data-testid="disconnect-confirmation"]').exists()).toBe(false);
		expect(mocks.disconnect).toHaveBeenCalledWith('example', 'credential-managed', {
			deleteExternalResource: undefined,
		});
	});
});
