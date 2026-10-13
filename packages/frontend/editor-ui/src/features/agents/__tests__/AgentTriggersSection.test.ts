import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { fireEvent, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import * as credentialsApi from '@/features/credentials/credentials.api';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';

import AgentTriggersSection from '../components/AgentTriggersSection.vue';

enableAutoUnmount(afterEach);

vi.mock('@/features/credentials/credentials.api');
vi.mock('@/features/credentials/credentials.ee.api');

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: { baseUrl: 'http://localhost:5678', sessionId: 'test-session' },
		baseUrl: 'http://localhost:5678',
	}),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: vi.fn(),
		getNodeVersions: vi.fn(() => []),
	}),
}));

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({
		isEnterpriseFeatureEnabled: { sharing: true },
	}),
}));

const modelCredential = mock<ICredentialsResponse>({
	id: 'model-credential',
	name: 'Model credential',
	type: 'openAiApi',
});

vi.mock('../composables/useAgentIntegrationsCatalog', () => ({
	useAgentIntegrationsCatalog: () => ({
		catalog: { value: [] },
		ensureLoaded: vi.fn().mockResolvedValue([]),
	}),
}));

const { fetchStatusSpy, disconnectSpy, loadRuntimeSpy, showErrorSpy } = vi.hoisted(
	function createStatusSpy() {
		return {
			fetchStatusSpy: vi.fn().mockResolvedValue(undefined),
			disconnectSpy: vi.fn(),
			loadRuntimeSpy: vi.fn(),
			showErrorSpy: vi.fn(),
		};
	},
);

const connectedCredentials = ref<Record<string, string>>({});
const configured = ref<Record<string, boolean>>({});
const managedCredential = ref(false);

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorSpy }),
}));

vi.mock('../channels/slack/useSlackChannelRuntime', async (importOriginal) => ({
	...(await importOriginal<typeof import('../channels/slack/useSlackChannelRuntime')>()),
	useSlackChannelRuntime: () => ({
		load: loadRuntimeSpy,
		loading: ref(false),
		setup: ref({}),
		isManagedCredential: () => managedCredential.value,
	}),
}));

vi.mock('../composables/useAgentIntegrationStatus', function mockIntegrationStatus() {
	return {
		useAgentIntegrationStatus: function useAgentIntegrationStatus() {
			return {
				connectedCredentials,
				fetchStatus: fetchStatusSpy,
				disconnect: disconnectSpy,
				loadingMap: ref({}),
				runtimeErrors: ref({}),
				hasRuntimeError: () => false,
				isConnected: (type: string) => configured.value[type] ?? false,
				isConfigured: (type: string) => configured.value[type] ?? false,
			};
		},
	};
});

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const n8nChatFlag = vi.hoisted(() => ({ value: false }));
vi.mock('../composables/useAgentsN8nChatFlag', () => ({
	useAgentsN8nChatFlag: () => n8nChatFlag,
}));

vi.mock('../components/AgentChannelModal.vue', () => ({
	default: {
		name: 'AgentChannelModal',
		props: ['simpleSetup', 'isPublished', 'view', 'savedDescription', 'saveDescription'],
		template:
			'<div data-testid="agent-channel-modal-stub" :data-simple-setup="simpleSetup" :data-is-published="isPublished" :data-view="view" :data-saved-description="savedDescription" />',
	},
}));

function mountSection(
	simpleChannelSetup?: boolean,
	isPublished = false,
	extraProps: Record<string, unknown> = {},
) {
	return mount(AgentTriggersSection, {
		attachTo: document.body,
		props: {
			connectedTriggers: [],
			projectId: 'project-id',
			agentId: 'agent-id',
			simpleChannelSetup,
			isPublished,
			...extraProps,
		},
		global: {
			stubs: {
				N8nIcon: { template: '<span />' },
				N8nText: { template: '<span><slot /></span>' },
				AgentSchedulesRow: {
					name: 'AgentSchedulesRow',
					props: ['ensureAgentPersisted'],
					template: '<div />',
				},
			},
		},
	});
}

describe('AgentTriggersSection', () => {
	beforeEach(function resetMocks() {
		vi.clearAllMocks();
		setActivePinia(createPinia());
		vi.mocked(credentialsApi.getUsableCredentials).mockResolvedValue([]);
		connectedCredentials.value = {};
		configured.value = {};
		managedCredential.value = false;
		loadRuntimeSpy.mockResolvedValue(undefined);
		disconnectSpy.mockImplementation(async (type: string) => {
			configured.value[type] = false;
			delete connectedCredentials.value[type];
			return { status: 'disconnected' };
		});
		n8nChatFlag.value = false;
	});

	it.each(['credential-1', ''])(
		'disconnects a channel with credential %j and keeps the other channels',
		async (credentialId) => {
			connectedCredentials.value = { slack: credentialId };
			configured.value = { slack: true, telegram: true };
			const wrapper = mountSection(undefined, false, { connectedTriggers: ['slack', 'telegram'] });
			await flushPromises();

			await fireEvent.contextMenu(screen.getByRole('button', { name: 'slack' }));
			await userEvent.click(
				await screen.findByRole('menuitem', { name: 'agents.builder.contextMenu.remove' }),
			);
			await flushPromises();

			expect(disconnectSpy).toHaveBeenCalledWith('slack', credentialId, {
				deleteExternalResource: undefined,
			});
			expect(wrapper.emitted('update:connected-triggers')).toEqual([[['telegram']]]);
			expect(wrapper.emitted('agent-changed')).toEqual([[]]);
			expect(wrapper.find('[data-testid="agent-channel-modal-stub"]').exists()).toBe(false);
		},
	);

	it.each([false, true])(
		'loads managed Slack state before confirming removal with delete app = %s',
		async (deleteApp) => {
			connectedCredentials.value = { slack: 'managed-credential' };
			configured.value = { slack: true };
			const pending = Promise.withResolvers<void>();
			loadRuntimeSpy.mockImplementation(async () => {
				await pending.promise;
				managedCredential.value = true;
			});
			const wrapper = mountSection(undefined, true, { connectedTriggers: ['slack'] });
			await flushPromises();

			await fireEvent.contextMenu(screen.getByRole('button', { name: 'slack' }));
			await userEvent.click(
				await screen.findByRole('menuitem', { name: 'agents.builder.contextMenu.remove' }),
			);
			expect(disconnectSpy).not.toHaveBeenCalled();
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
			pending.resolve();
			await screen.findByRole('dialog');

			if (!deleteApp) {
				await userEvent.click(screen.getByRole('button', { name: 'generic.cancel' }));
				expect(disconnectSpy).not.toHaveBeenCalled();
				await fireEvent.contextMenu(screen.getByRole('button', { name: 'slack' }));
				await userEvent.click(
					await screen.findByRole('menuitem', { name: 'agents.builder.contextMenu.remove' }),
				);
				await screen.findByRole('dialog');
				await userEvent.click(screen.getByRole('checkbox'));
			}

			await userEvent.click(
				screen.getByRole('button', { name: 'agents.channels.slack.managed.remove.confirm' }),
			);
			await flushPromises();
			expect(disconnectSpy).toHaveBeenCalledExactlyOnceWith('slack', 'managed-credential', {
				deleteExternalResource: deleteApp,
			});
			expect(wrapper.emitted('update:connected-triggers')).toEqual([[[]]]);
		},
	);

	it('keeps a channel after a failed removal and permits a retry', async () => {
		configured.value = { slack: true };
		const error = new Error('Request failed');
		disconnectSpy.mockRejectedValueOnce(error);
		const wrapper = mountSection(undefined, false, { connectedTriggers: ['slack'] });
		await flushPromises();
		await fireEvent.contextMenu(screen.getByRole('button', { name: 'slack' }));
		await userEvent.click(
			await screen.findByRole('menuitem', { name: 'agents.builder.contextMenu.remove' }),
		);
		await flushPromises();

		expect(wrapper.emitted('update:connected-triggers')).toBeUndefined();
		expect(screen.getByRole('button', { name: 'slack' })).toBeEnabled();
		expect(showErrorSpy).toHaveBeenCalledWith(error, 'agents.channels.modal.removeChannelError');

		await fireEvent.contextMenu(screen.getByRole('button', { name: 'slack' }));
		await userEvent.click(
			await screen.findByRole('menuitem', { name: 'agents.builder.contextMenu.remove' }),
		);
		await flushPromises();
		expect(wrapper.emitted('update:connected-triggers')).toEqual([[[]]]);
	});

	it.each([{ disabled: true }, { agentId: 'another-agent' }])(
		'cancels removal after the host changes to %j while loading',
		async (updates) => {
			const pending = Promise.withResolvers<void>();
			loadRuntimeSpy.mockReturnValueOnce(pending.promise);
			const wrapper = mountSection(undefined, false, { connectedTriggers: ['slack'] });
			await flushPromises();
			await fireEvent.contextMenu(screen.getByRole('button', { name: 'slack' }));
			await userEvent.click(
				await screen.findByRole('menuitem', { name: 'agents.builder.contextMenu.remove' }),
			);
			await wrapper.setProps(updates);
			pending.resolve();
			await flushPromises();
			expect(disconnectSpy).not.toHaveBeenCalled();
			expect(wrapper.emitted('agent-changed')).toBeUndefined();
		},
	);

	it('blocks duplicate disconnects and ignores completion after an agent switch', async () => {
		const pending = Promise.withResolvers<{ status: string }>();
		disconnectSpy.mockReturnValueOnce(pending.promise);
		const wrapper = mountSection(undefined, false, { connectedTriggers: ['slack'] });
		await flushPromises();
		const chip = screen.getByRole('button', { name: 'slack' });
		await fireEvent.contextMenu(chip);
		await userEvent.click(
			await screen.findByRole('menuitem', { name: 'agents.builder.contextMenu.remove' }),
		);
		await fireEvent.contextMenu(chip);
		expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
		expect(disconnectSpy).toHaveBeenCalledTimes(1);
		await wrapper.setProps({ agentId: 'another-agent' });
		pending.resolve({ status: 'disconnected' });
		await flushPromises();
		expect(wrapper.emitted('agent-changed')).toBeUndefined();
	});

	it('preserves model credentials during channel refresh on mount and remount', async () => {
		const credentialsStore = useCredentialsStore();
		credentialsStore.setCredentials([modelCredential]);

		for (const phase of ['mount', 'remount']) {
			const pendingCredentials = Promise.withResolvers<ICredentialsResponse[]>();
			vi.mocked(credentialsApi.getUsableCredentials).mockReturnValueOnce(
				pendingCredentials.promise,
			);
			const wrapper = mountSection();
			await flushPromises();

			expect(credentialsApi.getUsableCredentials).toHaveBeenLastCalledWith(expect.anything(), {
				projectId: 'project-id',
			});
			expect(credentialsStore.getCredentialById(modelCredential.id), phase).toEqual(
				modelCredential,
			);

			pendingCredentials.resolve([modelCredential]);
			await flushPromises();

			expect(credentialsStore.getCredentialById(modelCredential.id)).toEqual(modelCredential);
			wrapper.unmount();
		}
	});

	it('preserves model credentials when the channel credential refresh fails', async () => {
		const credentialsStore = useCredentialsStore();
		credentialsStore.setCredentials([modelCredential]);
		vi.mocked(credentialsApi.getUsableCredentials).mockRejectedValueOnce(
			new Error('Credential refresh failed'),
		);
		const wrapper = mountSection();
		await flushPromises();

		expect(credentialsStore.getCredentialById(modelCredential.id)).toEqual(modelCredential);
		wrapper.unmount();
	});

	it('removes a missing credential only after the channel credential refresh completes', async () => {
		const credentialsStore = useCredentialsStore();
		credentialsStore.setCredentials([modelCredential]);
		const pendingCredentials = Promise.withResolvers<ICredentialsResponse[]>();
		vi.mocked(credentialsApi.getUsableCredentials).mockReturnValueOnce(pendingCredentials.promise);
		const wrapper = mountSection();
		await flushPromises();

		expect(credentialsStore.getCredentialById(modelCredential.id)).toEqual(modelCredential);

		pendingCredentials.resolve([]);
		await flushPromises();

		expect(credentialsStore.getCredentialById(modelCredential.id)).toBeUndefined();
		wrapper.unmount();
	});

	it('forwards persistence to the schedules row', async function forwardPersistenceToSchedules() {
		const ensureAgentPersisted = vi.fn().mockResolvedValue(undefined);
		const wrapper = mountSection(undefined, false, {
			agentUnsaved: true,
			ensureAgentPersisted,
		});
		await flushPromises();

		expect(wrapper.findComponent({ name: 'AgentSchedulesRow' }).props('ensureAgentPersisted')).toBe(
			ensureAgentPersisted,
		);
		expect(ensureAgentPersisted).not.toHaveBeenCalled();
	});

	it('loads channel status after same-ID persistence', async function loadPersistedStatus() {
		const wrapper = mountSection(undefined, false, { agentUnsaved: true });
		await flushPromises();

		expect(fetchStatusSpy).not.toHaveBeenCalled();

		await wrapper.setProps({ agentUnsaved: false });
		await flushPromises();

		expect(fetchStatusSpy).toHaveBeenCalledExactlyOnceWith([]);
	});

	describe('simpleChannelSetup', () => {
		it('does not force simple setup on the channel modal by default', async () => {
			const wrapper = mountSection();

			await wrapper.find('[data-testid="agent-channels-add-channel"]').trigger('click');
			await flushPromises();

			const modal = wrapper.find('[data-testid="agent-channel-modal-stub"]');
			expect(modal.exists()).toBe(true);
			expect(modal.attributes('data-simple-setup')).toBe('false');
		});

		it('forwards simpleChannelSetup to the channel modal as simple-setup', async () => {
			const wrapper = mountSection(true);

			await wrapper.find('[data-testid="agent-channels-add-channel"]').trigger('click');
			await flushPromises();

			const modal = wrapper.find('[data-testid="agent-channel-modal-stub"]');
			expect(modal.exists()).toBe(true);
			expect(modal.attributes('data-simple-setup')).toBe('true');
		});
	});

	it('forwards publication state to the channel modal', async () => {
		const wrapper = mountSection(undefined, true);

		await wrapper.find('[data-testid="agent-channels-add-channel"]').trigger('click');
		await flushPromises();

		expect(
			wrapper.find('[data-testid="agent-channel-modal-stub"]').attributes('data-is-published'),
		).toBe('true');
	});

	describe('n8n Chat chip', () => {
		function findChip(wrapper: ReturnType<typeof mountSection>, label: string) {
			return wrapper.findAll('button').find((button) => button.text().includes(label));
		}

		it('renders a chip with the n8n Chat label and icon when the flag is on', async () => {
			n8nChatFlag.value = true;
			const wrapper = mountSection(undefined, false, { connectedTriggers: ['n8n_chat'] });
			await flushPromises();

			const chip = findChip(wrapper, 'agents.channels.n8nChat.label');
			expect(chip).toBeTruthy();
			expect(chip?.find('[icon="message-square"]').exists()).toBe(true);
		});

		it('hides the chip when the flag is off', async () => {
			n8nChatFlag.value = false;
			const wrapper = mountSection(undefined, false, { connectedTriggers: ['n8n_chat'] });
			await flushPromises();

			expect(findChip(wrapper, 'agents.channels.n8nChat.label')).toBeUndefined();
		});

		it.each([
			{ connectedTriggers: ['n8n_chat'], view: 'n8n_chat_edit' },
			{ connectedTriggers: [], view: 'n8n_chat_setup' },
		])('opens the modal on $view when clicked', async ({ connectedTriggers, view }) => {
			n8nChatFlag.value = true;
			const wrapper = mountSection(undefined, false, { connectedTriggers });
			await flushPromises();

			await findChip(wrapper, 'agents.channels.n8nChat.label')?.trigger('click');
			await flushPromises();

			expect(wrapper.find('[data-testid="agent-channel-modal-stub"]').attributes('data-view')).toBe(
				view,
			);
			expect(wrapper.emitted('update:connected-triggers')).toBeUndefined();
		});

		it('shows the chip when n8n Chat is not a connected channel', async () => {
			n8nChatFlag.value = true;
			const wrapper = mountSection();
			await flushPromises();

			const chip = findChip(wrapper, 'agents.channels.n8nChat.label');
			expect(chip).toBeTruthy();
			expect(chip?.attributes('aria-description')).toBe('agents.builder.capabilities.deactivated');
		});

		it('puts n8n Chat first, before connected channels', async () => {
			n8nChatFlag.value = true;
			const wrapper = mountSection(undefined, false, { connectedTriggers: ['slack', 'n8n_chat'] });
			await flushPromises();

			expect(wrapper.findAll('button')[0].text()).toContain('agents.channels.n8nChat.label');
		});

		it('treats n8n Chat as connected when its status is configured', async () => {
			n8nChatFlag.value = true;
			configured.value = { n8n_chat: true };
			const wrapper = mountSection();
			await flushPromises();

			const chip = findChip(wrapper, 'agents.channels.n8nChat.label');
			expect(chip?.attributes('aria-description')).toBeUndefined();
			await chip?.trigger('click');
			await flushPromises();

			expect(wrapper.find('[data-testid="agent-channel-modal-stub"]').attributes('data-view')).toBe(
				'n8n_chat_edit',
			);
		});

		it('forwards savedDescription to the channel modal', async () => {
			n8nChatFlag.value = true;
			const wrapper = mountSection(undefined, false, {
				connectedTriggers: ['n8n_chat'],
				savedDescription: 'Handles support tickets',
			});
			await flushPromises();

			await wrapper.find('[data-testid="agent-channels-add-channel"]').trigger('click');
			await flushPromises();

			expect(
				wrapper
					.find('[data-testid="agent-channel-modal-stub"]')
					.attributes('data-saved-description'),
			).toBe('Handles support tickets');
		});
	});
});
