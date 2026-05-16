/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

import AgentAddTriggerModal from '../components/AgentAddTriggerModal.vue';
import AgentIntegrationsPanel from '../components/AgentIntegrationsPanel.vue';
import { clearAgentIntegrationStatusCache } from '../composables/useAgentIntegrationStatus';

const {
	fetchAllCredentialsForWorkflow,
	openNewCredential,
	openExistingCredential,
	getIntegrationStatus,
	connectIntegration,
	disconnectIntegration,
	ensureLoaded,
} = vi.hoisted(() => ({
	fetchAllCredentialsForWorkflow: vi.fn(),
	openNewCredential: vi.fn(),
	openExistingCredential: vi.fn(),
	getIntegrationStatus: vi.fn(),
	connectIntegration: vi.fn(),
	disconnectIntegration: vi.fn(),
	ensureLoaded: vi.fn(),
}));

const projectState = vi.hoisted(() => ({
	currentProject: { id: 'project-1', name: 'Project', scopes: ['credential:create'] },
	personalProject: null,
	myProjects: [],
}));

const slackIntegration = {
	type: 'slack',
	label: 'Slack',
	icon: 'slack',
	description: 'Connect Slack',
	connectedDescription: 'Connected to Slack',
	credentialTypes: ['slackOAuth2Api', 'slackApi'],
	noCredentialsMessage: 'No Slack credentials found.',
};

const telegramIntegration = {
	type: 'telegram',
	label: 'Telegram',
	icon: 'telegram',
	description: 'Connect Telegram',
	connectedDescription: 'Connected to Telegram',
	credentialTypes: ['telegramApi'],
	noCredentialsMessage: 'No Telegram credentials found.',
};

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
	i18n: { baseText: (key: string) => key },
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: {},
		urlBaseWebhook: 'https://hooks.example',
		OAuthCallbackUrls: { oauth2: 'https://hooks.example/rest/oauth2-credential/callback' },
	}),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({
		isModalActiveById: {},
		openNewCredential,
		openExistingCredential,
		closeModal: vi.fn(),
	}),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		setCredentials: vi.fn(),
		fetchAllCredentialsForWorkflow,
		getCredentialTypeByName: () => ({ displayName: 'Slack' }),
	}),
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => projectState,
}));

vi.mock('../composables/useAgentApi', () => ({
	getIntegrationStatus,
	connectIntegration,
	disconnectIntegration,
}));

vi.mock('../composables/useAgentIntegrationsCatalog', () => ({
	useAgentIntegrationsCatalog: () => ({
		catalog: { value: [slackIntegration, telegramIntegration] },
		ensureLoaded,
	}),
}));

vi.mock('../composables/useAgentPublish', () => ({
	useAgentPublish: () => ({
		publish: vi.fn(),
		publishing: false,
	}),
}));

vi.mock('../composables/useAgentConfirmationModal', () => ({
	useAgentConfirmationModal: () => ({
		openAgentConfirmationModal: vi.fn(),
	}),
}));

const AgentCredentialSelectStub = {
	props: ['modelValue', 'credentials', 'dataTestId', 'placeholder', 'credentialPermissions'],
	emits: ['create', 'update:modelValue'],
	template: `
		<div
			data-testid="agent-credential-select-stub"
			:data-test-id-prop="dataTestId"
			:data-can-create="String(credentialPermissions.create)"
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

const globalStubs = {
	AgentCredentialSelect: AgentCredentialSelectStub,
	AgentScheduleTriggerCard: { template: '<div data-testid="schedule-trigger-card" />' },
	Modal: {
		template:
			'<section><slot name="header" /><slot name="content" /><slot name="footer" /></section>',
	},
	N8nButton: {
		props: ['disabled', 'loading'],
		emits: ['click'],
		template:
			'<button v-bind="$attrs" :disabled="disabled || loading" @click="$emit(\'click\', $event)"><slot name="prefix" /><slot /></button>',
	},
	N8nCard: { template: '<article><slot name="header" /><slot /></article>' },
	N8nCallout: { template: '<div v-bind="$attrs"><slot /></div>' },
	N8nDialog: { template: '<div><slot /></div>' },
	N8nHeading: { template: '<h2><slot /></h2>' },
	N8nIcon: { template: '<i />' },
	N8nInput: {
		props: ['modelValue'],
		emits: ['update:modelValue'],
		template:
			'<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
	},
	N8nOption: { props: ['value', 'label'], template: '<option :value="value">{{ label }}</option>' },
	N8nSelect: {
		props: ['modelValue'],
		emits: ['update:modelValue'],
		template:
			'<select v-bind="$attrs" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot name="prefix" /><slot /></select>',
	},
	N8nText: { template: '<span><slot /></span>' },
};

describe('agent integration credential picker usage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		projectState.currentProject = {
			id: 'project-1',
			name: 'Project',
			scopes: ['credential:create'],
		};
		projectState.personalProject = null;
		projectState.myProjects = [];
		clearAgentIntegrationStatusCache('project-1', 'agent-1');
		getIntegrationStatus.mockResolvedValue({ integrations: [] });
		ensureLoaded.mockResolvedValue([slackIntegration, telegramIntegration]);
		fetchAllCredentialsForWorkflow.mockResolvedValue([
			{ id: 'cred-1', name: 'Workspace Slack', type: 'slackOAuth2Api' },
			{ id: 'cred-telegram', name: 'Telegram Bot', type: 'telegramApi' },
		]);
	});

	it('uses the shared credential picker in the add-trigger modal', async () => {
		const wrapper = mount(AgentAddTriggerModal, {
			props: {
				modalName: 'agentAddTriggerModal',
				data: {
					projectId: 'project-1',
					agentId: 'agent-1',
					agentName: 'Agent',
					isPublished: true,
					initialTriggerType: 'slack',
					connectedTriggers: [],
					onConnectedTriggersChange: vi.fn(),
					onTriggerAdded: vi.fn(),
				},
			},
			global: { stubs: globalStubs },
		});
		await flushPromises();

		const picker = wrapper.find('[data-testid="agent-credential-select-stub"]');
		expect(picker.exists()).toBe(true);
		expect(picker.attributes('data-test-id-prop')).toBe('slack-credential-select');
		expect(picker.attributes('data-can-create')).toBe('true');

		await wrapper.find('[data-testid="stub-create-credential"]').trigger('click');

		expect(openNewCredential).toHaveBeenCalledWith(
			'slackOAuth2Api',
			false,
			false,
			'project-1',
			undefined,
			undefined,
			undefined,
			{ hideAskAssistant: true },
		);
	});

	it('uses the shared credential picker in the integrations panel', async () => {
		const wrapper = mount(AgentIntegrationsPanel, {
			props: {
				projectId: 'project-1',
				agentId: 'agent-1',
				agentName: 'Agent',
				isPublished: true,
				focusType: 'slack',
			},
			global: { stubs: globalStubs },
		});
		await flushPromises();

		const picker = wrapper.find('[data-testid="agent-credential-select-stub"]');
		expect(picker.exists()).toBe(true);
		expect(picker.attributes('data-test-id-prop')).toBe('slack-credential-select');
		expect(picker.attributes('data-can-create')).toBe('true');

		await wrapper.find('[data-testid="stub-create-credential"]').trigger('click');

		expect(openNewCredential).toHaveBeenCalledWith(
			'slackApi',
			false,
			false,
			'project-1',
			undefined,
			undefined,
			undefined,
			{ hideAskAssistant: true },
		);
	});

	it('passes denied credential creation permission to the shared picker', async () => {
		projectState.currentProject = { id: 'project-1', name: 'Project', scopes: [] };

		const wrapper = mount(AgentIntegrationsPanel, {
			props: {
				projectId: 'project-1',
				agentId: 'agent-1',
				agentName: 'Agent',
				isPublished: true,
				focusType: 'slack',
			},
			global: { stubs: globalStubs },
		});
		await flushPromises();

		expect(
			wrapper.find('[data-testid="agent-credential-select-stub"]').attributes('data-can-create'),
		).toBe('false');
	});

	it('defaults Telegram setup to private mode and requires a user ID before connecting', async () => {
		const wrapper = mount(AgentIntegrationsPanel, {
			props: {
				projectId: 'project-1',
				agentId: 'agent-1',
				agentName: 'Agent',
				isPublished: true,
				focusType: 'telegram',
			},
			global: { stubs: globalStubs },
		});
		await flushPromises();

		expect(wrapper.find('[data-testid="telegram-user-ids"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="telegram-public-warning"]').exists()).toBe(false);
		expect(
			wrapper.find('[data-testid="telegram-connect-button"]').attributes('disabled'),
		).toBeDefined();

		await wrapper.find('[data-testid="stub-select-first-credential"]').trigger('click');
		const tagInput = wrapper.find('[data-testid="telegram-user-ids"] input');
		await tagInput.setValue('123, 123, 456');
		await tagInput.trigger('blur');
		await wrapper.find('[data-testid="telegram-connect-button"]').trigger('click');
		await flushPromises();

		expect(connectIntegration).toHaveBeenCalledWith(
			{},
			'project-1',
			'agent-1',
			'telegram',
			'cred-telegram',
			{ accessMode: 'private', allowedUsers: ['123', '456'] },
		);
	});

	it('renders the Telegram public warning for legacy connected integrations without settings', async () => {
		getIntegrationStatus.mockResolvedValue({
			integrations: [{ type: 'telegram', credentialId: 'cred-telegram' }],
		});

		const wrapper = mount(AgentIntegrationsPanel, {
			props: {
				projectId: 'project-1',
				agentId: 'agent-1',
				agentName: 'Agent',
				isPublished: true,
				focusType: 'telegram',
			},
			global: { stubs: globalStubs },
		});
		await flushPromises();

		expect(wrapper.find('[data-testid="telegram-public-warning"]').text()).toBe(
			'agents.builder.addTrigger.telegram.public.warning',
		);
		expect(wrapper.find('[data-testid="telegram-user-ids"]').exists()).toBe(false);
	});

	it('disables the Telegram form when connected so users must disconnect to edit', async () => {
		getIntegrationStatus.mockResolvedValue({
			integrations: [
				{
					type: 'telegram',
					credentialId: 'cred-telegram',
					settings: { accessMode: 'private', allowedUsers: ['123'] },
				},
			],
		});

		const wrapper = mount(AgentIntegrationsPanel, {
			props: {
				projectId: 'project-1',
				agentId: 'agent-1',
				agentName: 'Agent',
				isPublished: true,
				focusType: 'telegram',
			},
			global: { stubs: globalStubs },
		});
		await flushPromises();

		const userIds = wrapper.find('[data-testid="telegram-user-ids"]');
		expect(userIds.exists()).toBe(true);
		expect(userIds.find('input').attributes('disabled')).toBeDefined();
		expect(wrapper.find('[data-testid="telegram-telegram-settings-save"]').exists()).toBe(false);
	});
});
