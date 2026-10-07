import { createComponentRenderer } from '@/__tests__/render';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { configure, fireEvent, waitFor, within } from '@testing-library/vue';
import { computed, defineComponent, ref } from 'vue';

import AgentChannelTeamsEditView from './AgentChannelTeamsEditView.vue';
import { fetchTeamsAppPackage, getTeamsSetupState } from './api';
import { AGENT_PERSONALISATION_KEY } from '../types';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage: vi.fn(), showError: vi.fn() }),
}));

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

vi.mock('./api', () => ({
	checkTeamsCredential: vi.fn(),
	getTeamsSetupState: vi.fn(),
	fetchTeamsAppPackage: vi.fn(),
}));

configure({ testIdAttribute: 'data-testid' });

const WHERE_TITLE = 'agents.channels.teams.setup.availability.whereTitle';

const viewProps = {
	mode: 'edit',
	modelValue: 'cred-1',
	integration: {
		type: 'teams',
		label: 'Microsoft Teams',
		icon: 'teams',
		credentialTypes: ['microsoftEntraServicePrincipalApi'],
	},
	credentials: [],
	credentialPermissions: { create: true },
	credentialsLoading: false,
	loading: false,
	connected: true,
	connectedDescription: '',
	errorMessage: '',
	errorIsConflict: false,
	isPublished: true,
	agentName: 'Agent',
	projectId: 'p',
	agentId: 'a',
	forceNewCredential: false,
	simpleSetup: false,
	runtime: { load: vi.fn(), loading: { value: false } },
};

// The modal only ever talks to the outer view, so this stands in for it.
const Host = defineComponent({
	components: { AgentChannelTeamsEditView },
	setup() {
		const view = ref<InstanceType<typeof AgentChannelTeamsEditView>>();
		async function save() {
			await view.value?.beforeSave();
			await view.value?.afterSave();
		}
		return { view, viewProps, save };
	},
	template: `
		<div>
			<AgentChannelTeamsEditView ref="view" v-bind="viewProps" />
			<span data-testid="save-label">{{ view?.saveLabel ?? '' }}</span>
			<button data-testid="save" @click="save" />
		</div>
	`,
});

const renderHost = createComponentRenderer(Host, {
	global: {
		stubs: {
			AgentIntegrationCredentialConnection: { template: '<div />' },
		},
	},
});

describe('AgentChannelTeamsEditView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia({ stubActions: false });
		vi.mocked(getTeamsSetupState).mockResolvedValue({
			messagingEndpointUrl: 'https://n8n.example.com/webhooks/teams',
			botId: '11111111-2222-3333-4444-555555555555',
			deployToAzureUrl: null,
			credentialClaimedBy: null,
			defaultDisplayName: 'Support Bot',
			defaultDescription: 'Chat with Support Bot, an agent powered by n8n.',
		});
		vi.mocked(fetchTeamsAppPackage).mockResolvedValue(new Blob(['zip']));
	});

	it('passes the save label and the save hooks through to the modal', async () => {
		const { getByTestId } = renderHost();

		await waitFor(() => expect(getByTestId('teams-download-package')).toBeEnabled());
		expect(getByTestId('save-label')).toHaveTextContent('');

		await fireEvent.click(
			within(getByTestId('teams-availability')).getByLabelText(`Toggle ${WHERE_TITLE}`),
		);
		await fireEvent.click(getByTestId('teams-scope-groups'));
		expect(getByTestId('save-label')).toHaveTextContent(
			'agents.channels.teams.settings.saveAndDownload',
		);

		await fireEvent.click(getByTestId('save'));

		await waitFor(() =>
			expect(fetchTeamsAppPackage).toHaveBeenCalledWith(
				expect.anything(),
				'p',
				'a',
				'cred-1',
				expect.objectContaining({ groupChats: true }),
			),
		);
	});

	it("shows the agent's own icon on the identity card", async () => {
		const personalisation = computed(() => ({
			icon: 'heart',
			gradient: { from: '#2563EB', to: '#7C3AED', angle: 135, fromStop: 0, toStop: 100 },
		}));
		const { container, getByTestId } = renderHost({
			global: { provide: { [AGENT_PERSONALISATION_KEY]: personalisation } },
		});

		await waitFor(() => expect(getByTestId('teams-identity')).toBeInTheDocument());
		const tile = container.querySelector<HTMLElement>(
			'[data-test-id="agent-personalisation-icon-tile"]',
		);
		expect(tile?.style.getPropertyValue('--agent-personalisation-gradient-from')).toBe('#2563EB');
	});
});
