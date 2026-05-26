/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

import AgentAddTriggerModal from '../components/AgentAddTriggerModal.vue';
import { clearAgentIntegrationStatusCache } from '../composables/useAgentIntegrationStatus';

const {
	fetchAllCredentialsForWorkflow,
	openNewCredential,
	openExistingCredential,
	getIntegrationStatus,
	connectIntegration,
	disconnectIntegration,
	createSlackAgentApp,
	publishAgent,
	getSlackAgentAppManifest,
	ensureLoaded,
	openAgentConfirmationModal,
} = vi.hoisted(() => ({
	fetchAllCredentialsForWorkflow: vi.fn(),
	openNewCredential: vi.fn(),
	openExistingCredential: vi.fn(),
	getIntegrationStatus: vi.fn(),
	connectIntegration: vi.fn(),
	disconnectIntegration: vi.fn(),
	createSlackAgentApp: vi.fn(),
	publishAgent: vi.fn(),
	getSlackAgentAppManifest: vi.fn(),
	ensureLoaded: vi.fn(),
	openAgentConfirmationModal: vi.fn(),
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
	credentialTypes: ['slackApi'],
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

const linearIntegration = {
	type: 'linear',
	label: 'Linear',
	icon: 'linear',
	description: 'Connect Linear',
	connectedDescription: 'Connected to Linear',
	credentialTypes: ['linearOAuth2Api'],
	noCredentialsMessage: 'No Linear credentials found.',
};

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
	i18n: { baseText: (key: string) => key },
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: {},
		urlBaseWebhook: 'https://hooks.example',
		OAuthCallbackUrls: {
			oauth2: 'https://hooks.example/rest/oauth2-credential/callback',
		},
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
	createSlackAgentApp,
	publishAgent,
	getSlackAgentAppManifest,
}));

vi.mock('../composables/useAgentIntegrationsCatalog', () => ({
	useAgentIntegrationsCatalog: () => ({
		catalog: { value: [slackIntegration, telegramIntegration, linearIntegration] },
		ensureLoaded,
	}),
}));

vi.mock('../composables/useAgentConfirmationModal', () => ({
	useAgentConfirmationModal: () => ({
		openAgentConfirmationModal,
	}),
}));

const AgentCredentialSelectStub = {
	props: [
		'modelValue',
		'credentials',
		'dataTestId',
		'placeholder',
		'credentialPermissions',
		'disabled',
	],
	emits: ['create', 'update:modelValue'],
	template: `
		<div
			data-testid="agent-credential-select-stub"
			:data-test-id-prop="dataTestId"
			:data-can-create="String(credentialPermissions.create)"
			:data-disabled="String(!!disabled)"
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

const N8nCollapsiblePanelStub = {
	props: ['modelValue', 'title', 'disableAnimation'],
	emits: ['update:modelValue'],
	template: `
		<section
			data-testid="slack-manual-configuration"
			:data-open="String(modelValue)"
			:data-disable-animation="String(!!disableAnimation)"
		>
			<button
				data-testid="slack-manual-configuration-toggle"
				@click="$emit('update:modelValue', !modelValue)"
			>
				{{ title }}
			</button>
			<div v-if="modelValue" data-testid="slack-manual-configuration-content">
				<slot />
			</div>
		</section>
	`,
};

const globalStubs = {
	AgentCredentialSelect: AgentCredentialSelectStub,
	AgentScheduleTriggerCard: {
		name: 'AgentScheduleTriggerCard',
		template: '<div data-testid="schedule-trigger-card" />',
	},
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
	N8nCollapsiblePanel: N8nCollapsiblePanelStub,
	CollapsiblePanel: N8nCollapsiblePanelStub,
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
	let broadcastHandler: ((event: MessageEvent) => void) | undefined;

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
		fetchAllCredentialsForWorkflow.mockReset();
		openNewCredential.mockReset();
		openExistingCredential.mockReset();
		getIntegrationStatus.mockReset();
		connectIntegration.mockReset();
		disconnectIntegration.mockReset();
		createSlackAgentApp.mockReset();
		publishAgent.mockReset();
		getSlackAgentAppManifest.mockReset();
		ensureLoaded.mockReset();
		broadcastHandler = undefined;
		class BroadcastChannelTestDouble {
			addEventListener(_event: string, handler: (event: MessageEvent) => void) {
				broadcastHandler = handler;
			}

			close() {}
		}
		vi.stubGlobal('BroadcastChannel', BroadcastChannelTestDouble);
		Object.defineProperty(window, 'BroadcastChannel', {
			value: BroadcastChannelTestDouble,
			configurable: true,
		});
		vi.spyOn(window, 'open').mockReturnValue({
			close: vi.fn(),
			closed: false,
		} as unknown as Window);
		projectState.currentProject = {
			id: 'project-1',
			name: 'Project',
			scopes: ['credential:create'],
		};
		projectState.personalProject = null;
		projectState.myProjects = [];
		clearAgentIntegrationStatusCache('project-1', 'agent-1');
		getIntegrationStatus.mockResolvedValue({ integrations: [] });
		getSlackAgentAppManifest.mockResolvedValue({
			manifest: {
				display_information: { name: 'Backend Slack App' },
				features: {
					app_home: {
						home_tab_enabled: true,
						messages_tab_enabled: false,
						messages_tab_read_only_enabled: false,
					},
					bot_user: {
						display_name: 'Backend Slack App',
						always_online: true,
					},
				},
				oauth_config: {
					scopes: { bot: ['chat:write'] },
				},
				settings: {
					event_subscriptions: {
						request_url:
							'https://hooks.example/rest/projects/project-1/agents/v2/agent-1/webhooks/slack',
						bot_events: ['app_mention'],
					},
					interactivity: {
						is_enabled: true,
						request_url:
							'https://hooks.example/rest/projects/project-1/agents/v2/agent-1/webhooks/slack',
					},
					org_deploy_enabled: false,
					socket_mode_enabled: false,
					token_rotation_enabled: false,
				},
			},
		});
		ensureLoaded.mockResolvedValue([slackIntegration, telegramIntegration]);
		openAgentConfirmationModal.mockResolvedValue('confirm');
		connectIntegration.mockResolvedValue({ status: 'connected' });
		fetchAllCredentialsForWorkflow.mockResolvedValue([
			{ id: 'cred-1', name: 'Workspace Slack', type: 'slackApi' },
			{ id: 'cred-telegram', name: 'Telegram Bot', type: 'telegramApi' },
		]);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('keeps the Slack credential picker and app manifest inside manual configuration', async () => {
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

		expect(wrapper.find('[data-testid="slack-app-configuration-token"]').exists()).toBe(true);
		expect(
			wrapper.find('[data-testid="slack-app-configuration-token-link"]').attributes('href'),
		).toBe('https://api.slack.com/apps');
		expect(wrapper.find('[data-testid="slack-manual-configuration"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="slack-manual-configuration"]').attributes()).toMatchObject({
			'data-disable-animation': 'true',
		});
		expect(wrapper.find('[data-testid="agent-credential-select-stub"]').exists()).toBe(false);
		expect(wrapper.find('pre').exists()).toBe(false);

		await wrapper.find('[data-testid="slack-manual-configuration-toggle"]').trigger('click');
		await flushPromises();

		const picker = wrapper.find('[data-testid="agent-credential-select-stub"]');
		expect(picker.exists()).toBe(true);
		expect(picker.attributes('data-test-id-prop')).toBe('slack-credential-select');
		expect(picker.attributes('data-can-create')).toBe('true');
		expect(wrapper.text()).toContain('agents.builder.addTrigger.slack.manual.description');
		expect(wrapper.find('pre').exists()).toBe(true);
		expect(wrapper.find('pre').text()).toContain('"name": "Backend Slack App"');
		expect(getSlackAgentAppManifest).toHaveBeenCalledWith({}, 'project-1', 'agent-1');
		const manualContentHtml = wrapper
			.find('[data-testid="slack-manual-configuration-content"]')
			.html();
		expect(manualContentHtml.indexOf('<pre')).toBeLessThan(
			manualContentHtml.indexOf('agent-credential-select-stub'),
		);

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

	it('does not include n8n OAuth callback URLs in the Slack app manifest', async () => {
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

		await wrapper.find('[data-testid="slack-manual-configuration-toggle"]').trigger('click');
		await flushPromises();

		const manifest = wrapper.find('pre').text();
		expect(manifest).not.toContain('redirect_urls');
		expect(manifest).not.toContain('oauth2-credential');
	});

	it('connects an existing Slack credential from manual configuration', async () => {
		const onTriggerAdded = vi.fn();
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
					onTriggerAdded,
				},
			},
			global: { stubs: globalStubs },
		});
		await flushPromises();

		await wrapper.find('[data-testid="slack-manual-configuration-toggle"]').trigger('click');
		await flushPromises();
		await wrapper.find('[data-testid="stub-select-first-credential"]').trigger('click');
		await wrapper.find('[data-testid="slack-connect-button"]').trigger('click');
		await flushPromises();

		expect(connectIntegration).toHaveBeenCalledWith(
			{},
			'project-1',
			'agent-1',
			'slack',
			'cred-1',
			undefined,
		);
		expect(onTriggerAdded).toHaveBeenCalledWith({
			triggerType: 'slack',
			triggers: ['slack'],
		});
	});

	it('shows the connected Slack state with a disconnect action in the footer', async () => {
		getIntegrationStatus.mockResolvedValue({
			integrations: [{ type: 'slack', credentialId: 'cred-1' }],
		});
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

		expect(wrapper.find('[data-testid="slack-manual-configuration"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="slack-app-configuration-token"]').exists()).toBe(false);
		expect(wrapper.text()).toContain('agents.builder.addTrigger.connectedText.slack');
		expect(wrapper.find('[data-testid="slack-connect-button"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="slack-disconnect-button"]').exists()).toBe(true);

		await wrapper.find('[data-testid="slack-disconnect-button"]').trigger('click');
		await flushPromises();

		expect(disconnectIntegration).toHaveBeenCalledWith(
			{},
			'project-1',
			'agent-1',
			'slack',
			'cred-1',
		);
	});

	it('creates and installs a Slack app with a temporary app configuration token', async () => {
		getIntegrationStatus
			.mockResolvedValue({ integrations: [{ type: 'slack', credentialId: 'cred-created' }] })
			.mockResolvedValueOnce({ integrations: [] })
			.mockResolvedValueOnce({ integrations: [] });
		fetchAllCredentialsForWorkflow
			.mockResolvedValueOnce([{ id: 'cred-1', name: 'Workspace Slack', type: 'slackApi' }])
			.mockResolvedValueOnce([
				{ id: 'cred-1', name: 'Workspace Slack', type: 'slackApi' },
				{ id: 'cred-created', name: 'Slack - Agent', type: 'slackApi' },
			]);
		createSlackAgentApp.mockResolvedValue({
			appId: 'A123',
			installUrl: 'https://slack.com/oauth/v2/authorize?state=setup-state',
		});
		const onConnectedTriggersChange = vi.fn();
		const onTriggerAdded = vi.fn();
		const onAgentChanged = vi.fn();

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
					onConnectedTriggersChange,
					onTriggerAdded,
					onAgentChanged,
				},
			},
			global: { stubs: globalStubs },
		});
		await flushPromises();

		await wrapper.find('[data-testid="slack-app-configuration-token"]').setValue('xoxe-config');
		await wrapper.find('[data-testid="slack-create-app"]').trigger('click');
		await flushPromises();

		expect(createSlackAgentApp).toHaveBeenCalledWith({}, 'project-1', 'agent-1', 'xoxe-config');
		expect(window.open).toHaveBeenCalledWith(
			'https://slack.com/oauth/v2/authorize?state=setup-state',
			'Slack App Authorization',
			expect.any(String),
		);
		expect(vi.mocked(window.open).mock.calls[0]?.[2]).toContain('noopener');

		for (let attempts = 0; attempts < 3 && !broadcastHandler; attempts++) {
			await flushPromises();
		}
		expect(broadcastHandler).toBeDefined();
		broadcastHandler?.({ data: 'success' } as MessageEvent);
		await flushPromises();
		await flushPromises();

		expect(onConnectedTriggersChange).toHaveBeenLastCalledWith(['slack']);
		expect(onTriggerAdded).toHaveBeenCalledWith({
			triggerType: 'slack',
			triggers: ['slack'],
		});
		expect(onAgentChanged).toHaveBeenCalledOnce();
	});

	it('waits for the Slack OAuth callback when noopener prevents a popup handle', async () => {
		getIntegrationStatus
			.mockResolvedValue({ integrations: [{ type: 'slack', credentialId: 'cred-created' }] })
			.mockResolvedValueOnce({ integrations: [] })
			.mockResolvedValueOnce({ integrations: [] });
		fetchAllCredentialsForWorkflow
			.mockResolvedValueOnce([{ id: 'cred-1', name: 'Workspace Slack', type: 'slackApi' }])
			.mockResolvedValueOnce([
				{ id: 'cred-1', name: 'Workspace Slack', type: 'slackApi' },
				{ id: 'cred-created', name: 'Slack - Agent', type: 'slackApi' },
			]);
		createSlackAgentApp.mockResolvedValue({
			appId: 'A123',
			installUrl: 'https://slack.com/oauth/v2/authorize?state=setup-state',
		});
		vi.mocked(window.open).mockReturnValue(null);
		const onConnectedTriggersChange = vi.fn();
		const onTriggerAdded = vi.fn();

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
					onConnectedTriggersChange,
					onTriggerAdded,
				},
			},
			global: { stubs: globalStubs },
		});
		await flushPromises();

		await wrapper.find('[data-testid="slack-app-configuration-token"]').setValue('xoxe-config');
		await wrapper.find('[data-testid="slack-create-app"]').trigger('click');
		await flushPromises();

		expect(wrapper.find('[data-testid="slack-app-setup-error"]').exists()).toBe(false);
		expect(broadcastHandler).toBeDefined();

		broadcastHandler?.({ data: 'success' } as MessageEvent);
		await flushPromises();
		await flushPromises();

		expect(onConnectedTriggersChange).toHaveBeenLastCalledWith(['slack']);
		expect(onTriggerAdded).toHaveBeenCalledWith({
			triggerType: 'slack',
			triggers: ['slack'],
		});
	});

	it('waits for the Slack OAuth callback even if the cross-origin popup reports closed', async () => {
		vi.useFakeTimers();
		getIntegrationStatus
			.mockResolvedValue({ integrations: [{ type: 'slack', credentialId: 'cred-created' }] })
			.mockResolvedValueOnce({ integrations: [] })
			.mockResolvedValueOnce({ integrations: [] });
		fetchAllCredentialsForWorkflow
			.mockResolvedValueOnce([{ id: 'cred-1', name: 'Workspace Slack', type: 'slackApi' }])
			.mockResolvedValueOnce([
				{ id: 'cred-1', name: 'Workspace Slack', type: 'slackApi' },
				{ id: 'cred-created', name: 'Slack - Agent', type: 'slackApi' },
			]);
		createSlackAgentApp.mockResolvedValue({
			appId: 'A123',
			installUrl: 'https://slack.com/oauth/v2/authorize?state=setup-state',
		});
		vi.mocked(window.open).mockReturnValue({
			close: vi.fn(() => {
				throw new Error('Cross-origin popup close blocked');
			}),
			closed: true,
		} as unknown as Window);
		const onConnectedTriggersChange = vi.fn();
		const onTriggerAdded = vi.fn();

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
					onConnectedTriggersChange,
					onTriggerAdded,
				},
			},
			global: { stubs: globalStubs },
		});
		await flushPromises();

		await wrapper.find('[data-testid="slack-app-configuration-token"]').setValue('xoxe-config');
		await wrapper.find('[data-testid="slack-create-app"]').trigger('click');
		await flushPromises();

		await vi.advanceTimersByTimeAsync(500);
		await flushPromises();

		expect(wrapper.find('[data-testid="slack-app-setup-error"]').exists()).toBe(false);
		expect(onTriggerAdded).not.toHaveBeenCalled();

		expect(broadcastHandler).toBeDefined();
		expect(() => broadcastHandler?.({ data: 'success' } as MessageEvent)).not.toThrow();
		await flushPromises();
		await flushPromises();

		expect(onConnectedTriggersChange).toHaveBeenLastCalledWith(['slack']);
		expect(onTriggerAdded).toHaveBeenCalledWith({
			triggerType: 'slack',
			triggers: ['slack'],
		});
	});

	it('polls Slack integration status when the OAuth callback is on another origin', async () => {
		vi.useFakeTimers();
		getIntegrationStatus
			.mockResolvedValue({ integrations: [{ type: 'slack', credentialId: 'cred-created' }] })
			.mockResolvedValueOnce({ integrations: [] })
			.mockResolvedValueOnce({ integrations: [] });
		fetchAllCredentialsForWorkflow
			.mockResolvedValueOnce([{ id: 'cred-1', name: 'Workspace Slack', type: 'slackApi' }])
			.mockResolvedValueOnce([
				{ id: 'cred-1', name: 'Workspace Slack', type: 'slackApi' },
				{ id: 'cred-created', name: 'Slack - Agent', type: 'slackApi' },
			]);
		createSlackAgentApp.mockResolvedValue({
			appId: 'A123',
			installUrl: 'https://slack.com/oauth/v2/authorize?state=setup-state',
		});
		const onConnectedTriggersChange = vi.fn();
		const onTriggerAdded = vi.fn();

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
					onConnectedTriggersChange,
					onTriggerAdded,
				},
			},
			global: { stubs: globalStubs },
		});
		await flushPromises();

		await wrapper.find('[data-testid="slack-app-configuration-token"]').setValue('xoxe-config');
		await wrapper.find('[data-testid="slack-create-app"]').trigger('click');
		await flushPromises();

		expect(onTriggerAdded).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(2000);
		await flushPromises();
		await flushPromises();

		expect(onConnectedTriggersChange).toHaveBeenLastCalledWith(['slack']);
		expect(onTriggerAdded).toHaveBeenCalledWith({
			triggerType: 'slack',
			triggers: ['slack'],
		});
	});

	it('starts checking Slack integration status immediately after opening the install window', async () => {
		vi.useFakeTimers();
		getIntegrationStatus
			.mockResolvedValue({ integrations: [{ type: 'slack', credentialId: 'cred-created' }] })
			.mockResolvedValueOnce({ integrations: [] });
		fetchAllCredentialsForWorkflow
			.mockResolvedValueOnce([{ id: 'cred-1', name: 'Workspace Slack', type: 'slackApi' }])
			.mockResolvedValueOnce([
				{ id: 'cred-1', name: 'Workspace Slack', type: 'slackApi' },
				{ id: 'cred-created', name: 'Slack - Agent', type: 'slackApi' },
			]);
		createSlackAgentApp.mockResolvedValue({
			appId: 'A123',
			installUrl: 'https://slack.com/oauth/v2/authorize?state=setup-state',
		});
		const onConnectedTriggersChange = vi.fn();
		const onTriggerAdded = vi.fn();

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
					onConnectedTriggersChange,
					onTriggerAdded,
				},
			},
			global: { stubs: globalStubs },
		});
		await flushPromises();

		await wrapper.find('[data-testid="slack-app-configuration-token"]').setValue('xoxe-config');
		await wrapper.find('[data-testid="slack-create-app"]').trigger('click');
		await flushPromises();
		await flushPromises();

		expect(onConnectedTriggersChange).toHaveBeenLastCalledWith(['slack']);
		expect(onTriggerAdded).toHaveBeenCalledWith({
			triggerType: 'slack',
			triggers: ['slack'],
		});
		expect(wrapper.find('[data-testid="slack-create-app"]').exists()).toBe(false);
	});

	it('passes denied credential creation permission to the shared picker', async () => {
		projectState.currentProject = { id: 'project-1', name: 'Project', scopes: [] };

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

		await wrapper.find('[data-testid="slack-manual-configuration-toggle"]').trigger('click');
		await flushPromises();

		expect(
			wrapper.find('[data-testid="agent-credential-select-stub"]').attributes('data-can-create'),
		).toBe('false');
	});

	it('uses the published agent returned by the connect endpoint for unpublished agents', async () => {
		const onAgentPublished = vi.fn();
		const publishedAgent = { id: 'agent-1', publishedVersion: {} };
		connectIntegration.mockResolvedValueOnce({ status: 'connected', agent: publishedAgent });

		const wrapper = mount(AgentAddTriggerModal, {
			props: {
				modalName: 'agentAddTriggerModal',
				data: {
					projectId: 'project-1',
					agentId: 'agent-1',
					agentName: 'Agent',
					isPublished: false,
					initialTriggerType: 'slack',
					connectedTriggers: [],
					onConnectedTriggersChange: vi.fn(),
					onTriggerAdded: vi.fn(),
					onAgentPublished,
				},
			},
			global: { stubs: globalStubs },
		});
		await flushPromises();

		await wrapper.find('[data-testid="slack-manual-configuration-toggle"]').trigger('click');
		await flushPromises();

		await wrapper.find('[data-testid="stub-select-first-credential"]').trigger('click');
		await wrapper.find('[data-testid="slack-connect-button"]').trigger('click');
		await flushPromises();

		expect(openAgentConfirmationModal).toHaveBeenCalledOnce();
		expect(connectIntegration).toHaveBeenCalledWith(
			{},
			'project-1',
			'agent-1',
			'slack',
			'cred-1',
			undefined,
		);
		expect(onAgentPublished).toHaveBeenCalledWith(publishedAgent);
	});

	it('defaults Telegram setup to private mode and requires a user ID before connecting', async () => {
		const onAgentChanged = vi.fn();
		const wrapper = mount(AgentAddTriggerModal, {
			props: {
				modalName: 'agentAddTriggerModal',
				data: {
					projectId: 'project-1',
					agentId: 'agent-1',
					agentName: 'Agent',
					isPublished: true,
					initialTriggerType: 'telegram',
					connectedTriggers: [],
					onConnectedTriggersChange: vi.fn(),
					onTriggerAdded: vi.fn(),
					onAgentChanged,
				},
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
		expect(onAgentChanged).toHaveBeenCalledOnce();
	});

	it('renders the Telegram public warning for legacy connected integrations without settings', async () => {
		getIntegrationStatus.mockResolvedValue({
			integrations: [{ type: 'telegram', credentialId: 'cred-telegram' }],
		});

		const wrapper = mount(AgentAddTriggerModal, {
			props: {
				modalName: 'agentAddTriggerModal',
				data: {
					projectId: 'project-1',
					agentId: 'agent-1',
					agentName: 'Agent',
					isPublished: true,
					initialTriggerType: 'telegram',
					connectedTriggers: [],
					onConnectedTriggersChange: vi.fn(),
					onTriggerAdded: vi.fn(),
				},
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
		const onAgentChanged = vi.fn();
		getIntegrationStatus.mockResolvedValue({
			integrations: [
				{
					type: 'telegram',
					credentialId: 'cred-telegram',
					settings: { accessMode: 'private', allowedUsers: ['123'] },
				},
			],
		});

		const wrapper = mount(AgentAddTriggerModal, {
			props: {
				modalName: 'agentAddTriggerModal',
				data: {
					projectId: 'project-1',
					agentId: 'agent-1',
					agentName: 'Agent',
					isPublished: true,
					initialTriggerType: 'telegram',
					connectedTriggers: [],
					onConnectedTriggersChange: vi.fn(),
					onTriggerAdded: vi.fn(),
					onAgentChanged,
				},
			},
			global: { stubs: globalStubs },
		});
		await flushPromises();

		const userIds = wrapper.find('[data-testid="telegram-user-ids"]');
		expect(userIds.exists()).toBe(true);
		expect(userIds.find('input').attributes('disabled')).toBeDefined();
		expect(wrapper.find('[data-testid="telegram-disconnect-button"]').exists()).toBe(true);

		await wrapper.find('[data-testid="telegram-disconnect-button"]').trigger('click');
		await flushPromises();

		expect(disconnectIntegration).toHaveBeenCalledWith(
			{},
			'project-1',
			'agent-1',
			'telegram',
			'cred-telegram',
		);
		expect(onAgentChanged).toHaveBeenCalledOnce();
	});

	it('shows Linear app setup URLs in the trigger modal', async () => {
		ensureLoaded.mockResolvedValue([slackIntegration, telegramIntegration, linearIntegration]);

		const wrapper = mount(AgentAddTriggerModal, {
			props: {
				modalName: 'agentAddTriggerModal',
				data: {
					projectId: 'project-1',
					agentId: 'agent-1',
					agentName: 'Agent',
					isPublished: true,
					initialTriggerType: 'linear',
					connectedTriggers: [],
					onConnectedTriggersChange: vi.fn(),
					onTriggerAdded: vi.fn(),
				},
			},
			global: { stubs: globalStubs },
		});
		await flushPromises();

		expect(wrapper.find('[data-testid="linear-app-setup-link"]').attributes('href')).toBe(
			'https://linear.app/settings/api/applications/new',
		);
		expect(wrapper.find('[data-testid="linear-oauth-callback-url"]').element).toMatchObject({
			value: 'https://hooks.example/rest/oauth2-credential/callback',
		});
		expect(wrapper.find('[data-testid="linear-webhook-url"]').element).toMatchObject({
			value: 'https://hooks.example/rest/projects/project-1/agents/v2/agent-1/webhooks/linear',
		});
		expect(wrapper.text()).toContain('agents.builder.addTrigger.linear.oauthCallbackUrl.label');
		expect(wrapper.text()).toContain('agents.builder.addTrigger.linear.webhookUrl.label');
	});

	it('notifies the builder when the schedule trigger is saved', async () => {
		const onAgentChanged = vi.fn();
		const wrapper = mount(AgentAddTriggerModal, {
			props: {
				modalName: 'agentAddTriggerModal',
				data: {
					projectId: 'project-1',
					agentId: 'agent-1',
					agentName: 'Agent',
					isPublished: true,
					initialTriggerType: 'schedule',
					connectedTriggers: [],
					onConnectedTriggersChange: vi.fn(),
					onTriggerAdded: vi.fn(),
					onAgentChanged,
				},
			},
			global: { stubs: globalStubs },
		});
		await flushPromises();

		wrapper.findComponent({ name: 'AgentScheduleTriggerCard' }).vm.$emit('saved');
		await flushPromises();

		expect(onAgentChanged).toHaveBeenCalledOnce();
	});
});
