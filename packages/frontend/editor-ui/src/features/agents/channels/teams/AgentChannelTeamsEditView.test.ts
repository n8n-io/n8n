import { createComponentRenderer } from '@/__tests__/render';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { configure, fireEvent, waitFor } from '@testing-library/vue';

import AgentChannelTeamsEditView from './AgentChannelTeamsEditView.vue';
import { getTeamsSetupState } from './api';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			options?.interpolate ? `${key} ${Object.values(options.interpolate).join(' ')}` : key,
	}),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

vi.mock('./api', () => ({
	checkTeamsCredential: vi.fn(),
	getTeamsSetupState: vi.fn(),
	fetchTeamsAppPackage: vi.fn(),
}));

configure({ testIdAttribute: 'data-testid' });

const ENDPOINT = 'https://n8n.example.com/rest/projects/p/agents/v2/a/webhooks/teams';

const renderComponent = createComponentRenderer(AgentChannelTeamsEditView, {
	global: {
		stubs: {
			AgentIntegrationCredentialConnection: {
				template: '<div data-testid="credential-connection" />',
			},
			ActionDropdown: {
				props: ['items'],
				emits: ['select'],
				template:
					'<button data-testid="teams-status-menu" @click="$emit(\'select\', items[0].id)">{{ items[0].label }}</button>',
			},
		},
	},
});

const props = (overrides: Record<string, unknown> = {}) => ({
	mode: 'edit' as const,
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
	runtimeStatus: 'connected',
	...overrides,
});

const STATUS = 'agents.channels.teams.settings.status';

describe('AgentChannelTeamsEditView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia({ stubActions: false });
		vi.mocked(getTeamsSetupState).mockResolvedValue({
			messagingEndpointUrl: ENDPOINT,
			botId: null,
			deployToAzureUrl: null,
			credentialClaimedBy: null,
			defaultDisplayName: 'Support Bot',
			defaultDescription: 'Chat with Support Bot, an agent powered by n8n.',
		});
	});

	it('opens on the channel status, above the credential', () => {
		const { getByTestId } = renderComponent({ props: props() });

		const banner = getByTestId('teams-status-banner');
		expect(
			banner.compareDocumentPosition(getByTestId('credential-connection')) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it.each([
		{ runtimeStatus: 'connected', isPublished: true, title: `${STATUS}.connected` },
		{ runtimeStatus: 'starting', isPublished: true, title: `${STATUS}.starting` },
		{ runtimeStatus: 'error', isPublished: true, title: `${STATUS}.error` },
		{ runtimeStatus: 'unknown', isPublished: true, title: `${STATUS}.unknown` },
		{ runtimeStatus: 'configured', isPublished: true, title: `${STATUS}.unpublished` },
		// A stale answer for an unpublished agent must not read as running.
		{ runtimeStatus: 'connected', isPublished: false, title: `${STATUS}.unpublished` },
	])('reads a $runtimeStatus channel (published: $isPublished)', ({ title, ...overrides }) => {
		const { getByTestId } = renderComponent({ props: props(overrides) });

		expect(getByTestId('teams-status-title')).toHaveTextContent(title);
	});

	it('says why a channel is not running', () => {
		const { getByTestId } = renderComponent({
			props: props({ runtimeStatus: 'error', runtimeError: 'Credential cred-1 not found' }),
		});

		expect(getByTestId('teams-status-hint')).toHaveTextContent('Credential cred-1 not found');
	});

	it('says when the channel last heard from someone', () => {
		const lastVerifiedAt = '2026-09-11T10:00:00.000Z';
		const { getByTestId } = renderComponent({ props: props({ lastVerifiedAt }) });

		const date = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(
			new Date(lastVerifiedAt),
		);
		expect(getByTestId('teams-status-title')).toHaveTextContent(
			`${STATUS}.verified ${STATUS}.connected ${date}`,
		);
	});

	it('shows no date for a channel that has not heard from anyone', () => {
		const { getByTestId } = renderComponent({ props: props() });

		expect(getByTestId('teams-status-title').textContent?.trim()).toBe(`${STATUS}.connected`);
	});

	it('reveals the messaging endpoint from the status menu', async () => {
		const { getByTestId, queryByTestId, container } = renderComponent({ props: props() });

		await waitFor(() => expect(getTeamsSetupState).toHaveBeenCalled());
		expect(queryByTestId('teams-endpoint-field')).toBeNull();

		await fireEvent.click(getByTestId('teams-status-menu'));

		await waitFor(() =>
			expect(container.querySelector('#teams-messaging-endpoint-url')).toHaveValue(ENDPOINT),
		);
	});
});
