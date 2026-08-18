import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import { nextTick, reactive } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import { INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY } from '../../constants';
import type { ToolConnectionCredentialAdapter } from '@/features/shared/toolsConnection/types';
import InstanceAiMcpConnectCard from '../InstanceAiMcpConnectCard.vue';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const mcpStoreMock = vi.fn();
vi.mock('../../instanceAiMcp.store', () => ({
	useInstanceAiMcpStore: () => mcpStoreMock(),
}));

const {
	telemetryMock,
	uiStoreMock,
	connectServerMock,
	connectWithCredentialMock,
	credentialsMock,
} = vi.hoisted(() => ({
	telemetryMock: {
		trackToolsListOpened: vi.fn(),
		trackSettingsOpened: vi.fn(),
		trackCredentialDropdownOpened: vi.fn(),
		trackFirstCredentialConnectionStart: vi.fn(),
		trackNewCredentialConnectionStart: vi.fn(),
		trackExistingCredentialSelected: vi.fn(),
	},
	uiStoreMock: {
		openModal: vi.fn(),
		openModalWithData: vi.fn(),
		openExistingCredential: vi.fn(),
		openNewCredential: vi.fn(),
		appliedTheme: 'light',
	},
	connectServerMock: vi.fn(),
	connectWithCredentialMock: vi.fn(),
	credentialsMock: {
		credentials: [] as Array<{ id: string; name: string; type: string }>,
	},
}));

vi.mock('../../instanceAiMcp.telemetry', () => ({
	useInstanceAiMcpTelemetry: () => telemetryMock,
}));

vi.mock('@/app/stores/ui.store', () => ({ useUIStore: () => uiStoreMock }));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		fetchAllCredentials: vi.fn(),
		getCredentialsByType: (type: string) =>
			credentialsMock.credentials.filter((credential) => credential.type === type),
	}),
	listenForCredentialChanges: vi.fn(),
}));

vi.mock('../../composables/useMcpServerConnect', () => ({
	useMcpServerConnect: () => ({
		connectServer: connectServerMock,
		connectWithCredential: connectWithCredentialMock,
		createCredentialAdapter: (
			openNewCredential: ToolConnectionCredentialAdapter['openNewCredential'],
		) => ({
			getCredentialsByType: (authType: string) =>
				credentialsMock.credentials.filter((credential) => credential.type === authType),
			openNewCredential,
			openExistingCredential: uiStoreMock.openExistingCredential,
		}),
	}),
}));

const BRAVE_PAYLOAD = {
	serverSlug: 'brave',
	title: 'Brave',
	tagline: 'Search the web',
	credentialType: 'braveMcpOAuth2Api',
};

const BRAVE_CATALOG_ENTRY = {
	slug: 'brave',
	name: 'brave',
	title: 'Brave Search',
	description: 'Brave',
	tagline: 'Search the web with Brave Search',
	version: '1',
	updatedAt: '2026-01-01',
	icons: [],
	credentialType: 'braveMcpOAuth2Api',
	tools: [],
	isOfficial: true,
	status: 'active' as const,
};

const BRAVE_CONNECTION = {
	id: 'conn-1',
	serverSlug: 'brave',
	credentialId: 'cred-1',
	credentialType: 'braveMcpOAuth2Api',
	status: 'connected' as const,
};

function makeMcpStore(overrides: Record<string, unknown> = {}) {
	return reactive({
		catalog: [BRAVE_CATALOG_ENTRY],
		connections: [] as Array<Record<string, unknown>>,
		fetchCatalogLazy: vi.fn(),
		fetchConnectionsLazy: vi.fn(),
		disconnect: vi.fn(),
		...overrides,
	});
}

const renderComponent = createComponentRenderer(InstanceAiMcpConnectCard);

describe('InstanceAiMcpConnectCard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		credentialsMock.credentials = [];
		setActivePinia(createTestingPinia({ stubActions: false }));
		mcpStoreMock.mockReturnValue(makeMcpStore());
	});

	it('prefers the live registry entry over the payload snapshot', () => {
		const { getByText } = renderComponent({ props: { servers: [BRAVE_PAYLOAD] } });

		expect(getByText('Brave Search')).toBeVisible();
		expect(getByText('Search the web with Brave Search')).toBeVisible();
	});

	it('falls back to the payload snapshot before the catalog loads', () => {
		mcpStoreMock.mockReturnValue(makeMcpStore({ catalog: null }));

		const { getByText } = renderComponent({ props: { servers: [BRAVE_PAYLOAD] } });

		expect(getByText('Brave')).toBeVisible();
		expect(getByText('Search the web')).toBeVisible();
	});

	it('resolves with the connected slug once a server is connected', async () => {
		const store = makeMcpStore();
		mcpStoreMock.mockReturnValue(store);
		connectServerMock.mockImplementation(() => {
			store.connections.push(BRAVE_CONNECTION);
			return Promise.resolve('conn-1');
		});
		const { getByTestId, emitted } = renderComponent({ props: { servers: [BRAVE_PAYLOAD] } });

		await nextTick();
		await fireEvent.click(getByTestId('tool-credential-picker-trigger-connect'));

		expect(telemetryMock.trackFirstCredentialConnectionStart).toHaveBeenCalledWith('brave');
		expect(connectServerMock).toHaveBeenCalledWith({
			slug: 'brave',
			credentialType: 'braveMcpOAuth2Api',
		});
		expect(emitted().resolve).toEqual([[{ approved: true, connectedSlugs: ['brave'] }]]);
	});

	it('resolves when the last row is connected from another surface', async () => {
		const store = makeMcpStore();
		mcpStoreMock.mockReturnValue(store);
		const { emitted } = renderComponent({ props: { servers: [BRAVE_PAYLOAD] } });

		await nextTick();
		expect(emitted().resolve).toBeUndefined();

		store.connections.push(BRAVE_CONNECTION);
		await nextTick();

		expect(emitted().resolve).toEqual([[{ approved: true, connectedSlugs: ['brave'] }]]);
	});

	it('stays open when every row was already connected before it appeared', async () => {
		mcpStoreMock.mockReturnValue(makeMcpStore({ connections: [BRAVE_CONNECTION] }));
		const { emitted, getByTestId } = renderComponent({ props: { servers: [BRAVE_PAYLOAD] } });

		await nextTick();

		expect(emitted().resolve).toBeUndefined();
		expect(getByTestId('instance-ai-mcp-connect-resolve')).toBeVisible();
	});

	it('auto-resolves once even if the card is re-enabled afterwards', async () => {
		const store = makeMcpStore();
		mcpStoreMock.mockReturnValue(store);
		const { emitted, rerender } = renderComponent({
			props: { servers: [BRAVE_PAYLOAD], readOnly: false },
		});

		await nextTick();
		store.connections.push(BRAVE_CONNECTION);
		await nextTick();

		expect(emitted().resolve).toHaveLength(1);

		await rerender({ servers: [BRAVE_PAYLOAD], readOnly: true });
		await rerender({ servers: [BRAVE_PAYLOAD], readOnly: false });

		expect(emitted().resolve).toHaveLength(1);
	});

	it('stays pending while only some rows are connected elsewhere', async () => {
		const store = makeMcpStore();
		mcpStoreMock.mockReturnValue(store);
		const { emitted, getByTestId } = renderComponent({
			props: {
				servers: [
					BRAVE_PAYLOAD,
					{ serverSlug: 'exa', title: 'Exa', credentialType: 'exaMcpOAuth2Api' },
				],
			},
		});

		store.connections.push(BRAVE_CONNECTION);
		await nextTick();

		expect(emitted().resolve).toBeUndefined();
		expect(getByTestId('instance-ai-mcp-connect-resolve')).toBeVisible();
	});

	it('stays pending when the user backs out of the credential flow', async () => {
		connectServerMock.mockResolvedValue(null);
		const { getByTestId, emitted } = renderComponent({ props: { servers: [BRAVE_PAYLOAD] } });

		await fireEvent.click(getByTestId('tool-credential-picker-trigger-connect'));

		expect(emitted().resolve).toBeUndefined();
	});

	it('resolves as unapproved when skipped', async () => {
		const { getByTestId, emitted } = renderComponent({ props: { servers: [BRAVE_PAYLOAD] } });

		await fireEvent.click(getByTestId('instance-ai-mcp-connect-resolve'));

		expect(emitted().resolve).toEqual([[{ approved: false, connectedSlugs: [] }]]);
	});

	it('continues as approved with what was connected when some rows are left', async () => {
		mcpStoreMock.mockReturnValue(makeMcpStore({ connections: [BRAVE_CONNECTION] }));
		const { getByTestId, emitted } = renderComponent({
			props: {
				servers: [
					BRAVE_PAYLOAD,
					{ serverSlug: 'exa', title: 'Exa', credentialType: 'exaMcpOAuth2Api' },
				],
			},
		});

		expect(getByTestId('instance-ai-mcp-connect-resolve')).toHaveTextContent(
			'instanceAi.mcpConnect.continue',
		);

		await nextTick();
		await fireEvent.click(getByTestId('instance-ai-mcp-connect-resolve'));

		expect(emitted().resolve).toEqual([[{ approved: true, connectedSlugs: ['brave'] }]]);
	});

	it('offers a skip label while nothing is connected', () => {
		const { getByTestId } = renderComponent({ props: { servers: [BRAVE_PAYLOAD] } });

		expect(getByTestId('instance-ai-mcp-connect-resolve')).toHaveTextContent(
			'instanceAi.mcpConnect.skip',
		);
	});

	it('opens the tools modal from browse all', async () => {
		const { getByTestId } = renderComponent({ props: { servers: [BRAVE_PAYLOAD] } });

		await fireEvent.click(getByTestId('instance-ai-mcp-connect-browse-all'));

		expect(telemetryMock.trackToolsListOpened).toHaveBeenCalled();
		expect(uiStoreMock.openModal).toHaveBeenCalledWith(INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY);
	});

	it('renders the expired title with no actions', () => {
		const { getByText, queryByTestId } = renderComponent({
			props: { servers: [BRAVE_PAYLOAD], expired: true },
		});

		expect(getByText('instanceAi.mcpConnect.titleExpired')).toBeVisible();
		expect(queryByTestId('instance-ai-mcp-connect-resolve')).toBeNull();
		expect(queryByTestId('tool-credential-picker-trigger-connect')).toBeNull();
	});

	it('connects from the payload credential type when the catalog is unavailable', async () => {
		mcpStoreMock.mockReturnValue(makeMcpStore({ catalog: null }));

		const { getByTestId } = renderComponent({
			props: { servers: [{ ...BRAVE_PAYLOAD, credentialType: 'braveMcpOAuth2Api' }] },
		});

		await fireEvent.click(getByTestId('tool-credential-picker-trigger-connect'));

		expect(connectServerMock).toHaveBeenCalledWith({
			slug: 'brave',
			credentialType: 'braveMcpOAuth2Api',
		});
	});

	describe('the shared credential picker', () => {
		it('offers the connected pill for a connected row', () => {
			mcpStoreMock.mockReturnValue(makeMcpStore({ connections: [BRAVE_CONNECTION] }));

			const { getByTestId, queryByTestId } = renderComponent({
				props: { servers: [BRAVE_PAYLOAD], readOnly: true },
			});

			expect(getByTestId('tool-credential-picker-trigger-connected')).toHaveTextContent(
				'tools.connection.action.connected',
			);
			expect(queryByTestId('tool-credential-picker-trigger-connect')).toBeNull();
			expect(queryByTestId('instance-ai-mcp-connect-resolve')).toBeNull();
		});

		it('switches the credential of a live connection from the connected menu', async () => {
			mcpStoreMock.mockReturnValue(makeMcpStore({ connections: [BRAVE_CONNECTION] }));
			credentialsMock.credentials = [
				{ id: 'cred-1', name: 'Brave key', type: 'braveMcpOAuth2Api' },
				{ id: 'cred-2', name: 'Other Brave key', type: 'braveMcpOAuth2Api' },
			];

			const { getByTestId, getByText, findAllByTestId } = renderComponent({
				props: { servers: [BRAVE_PAYLOAD], readOnly: true },
			});

			await fireEvent.click(getByTestId('tool-credential-picker-trigger-connected'));

			expect(telemetryMock.trackCredentialDropdownOpened).toHaveBeenCalledWith('brave');
			await findAllByTestId('tool-credential-picker-row');
			await fireEvent.click(getByText('Other Brave key'));

			expect(telemetryMock.trackExistingCredentialSelected).toHaveBeenCalledWith('brave');
			expect(connectWithCredentialMock).toHaveBeenCalledWith('brave', 'cred-2');
		});

		it('opens an existing credential for editing from the connected menu', async () => {
			mcpStoreMock.mockReturnValue(makeMcpStore({ connections: [BRAVE_CONNECTION] }));
			credentialsMock.credentials = [
				{ id: 'cred-1', name: 'Brave key', type: 'braveMcpOAuth2Api' },
			];

			const { getByTestId, findByTestId } = renderComponent({
				props: { servers: [BRAVE_PAYLOAD], readOnly: true },
			});

			await fireEvent.click(getByTestId('tool-credential-picker-trigger-connected'));
			await fireEvent.click(await findByTestId('tool-credential-picker-edit'));

			expect(uiStoreMock.openExistingCredential).toHaveBeenCalledWith('cred-1');
		});

		it('creates a new credential from the connected menu', async () => {
			mcpStoreMock.mockReturnValue(makeMcpStore({ connections: [BRAVE_CONNECTION] }));
			credentialsMock.credentials = [
				{ id: 'cred-1', name: 'Brave key', type: 'braveMcpOAuth2Api' },
			];

			const { getByTestId, findByTestId } = renderComponent({
				props: { servers: [BRAVE_PAYLOAD], readOnly: true },
			});

			await fireEvent.click(getByTestId('tool-credential-picker-trigger-connected'));
			await fireEvent.click(await findByTestId('tool-credential-picker-create'));

			expect(telemetryMock.trackNewCredentialConnectionStart).toHaveBeenCalledWith('brave');
			expect(connectServerMock).toHaveBeenCalledWith({
				slug: 'brave',
				credentialType: 'braveMcpOAuth2Api',
			});
		});

		it('connects an unconnected row with an existing credential', async () => {
			credentialsMock.credentials = [
				{ id: 'cred-1', name: 'Brave key', type: 'braveMcpOAuth2Api' },
			];

			const { getByTestId, getByText, findAllByTestId } = renderComponent({
				props: { servers: [BRAVE_PAYLOAD] },
			});

			await fireEvent.click(getByTestId('tool-credential-picker-trigger-connect'));
			await findAllByTestId('tool-credential-picker-row');
			await fireEvent.click(getByText('Brave key'));

			expect(connectWithCredentialMock).toHaveBeenCalledWith('brave', 'cred-1');
			expect(connectServerMock).not.toHaveBeenCalled();
		});

		it('connects the row the picker belongs to when two rows share a credential type', async () => {
			const duckPayload = {
				serverSlug: 'duck',
				title: 'Duck',
				tagline: 'Search',
				credentialType: 'braveMcpOAuth2Api',
			};
			mcpStoreMock.mockReturnValue(
				makeMcpStore({
					catalog: [
						BRAVE_CATALOG_ENTRY,
						{ ...BRAVE_CATALOG_ENTRY, slug: 'duck', name: 'duck', title: 'Duck Search' },
					],
				}),
			);

			const { getAllByTestId } = renderComponent({
				props: { servers: [BRAVE_PAYLOAD, duckPayload] },
			});

			await fireEvent.click(getAllByTestId('tool-credential-picker-trigger-connect')[1]);

			expect(connectServerMock).toHaveBeenCalledWith({
				slug: 'duck',
				credentialType: 'braveMcpOAuth2Api',
			});
		});

		it('keeps the footer disabled while a connect is still in flight', async () => {
			mcpStoreMock.mockReturnValue(
				makeMcpStore({
					catalog: [
						BRAVE_CATALOG_ENTRY,
						{
							...BRAVE_CATALOG_ENTRY,
							slug: 'duck',
							name: 'duck',
							title: 'Duck Search',
							credentialType: 'duckMcpOAuth2Api',
						},
					],
				}),
			);
			credentialsMock.credentials = [
				{ id: 'cred-1', name: 'Brave key', type: 'braveMcpOAuth2Api' },
			];
			connectServerMock.mockReturnValue(new Promise(() => {}));

			const { getAllByTestId, getByTestId, getByText, findAllByTestId } = renderComponent({
				props: {
					servers: [
						BRAVE_PAYLOAD,
						{ serverSlug: 'duck', title: 'Duck', credentialType: 'duckMcpOAuth2Api' },
					],
				},
			});

			await fireEvent.click(getAllByTestId('tool-credential-picker-trigger-connect')[1]);
			expect(getByTestId('instance-ai-mcp-connect-resolve')).toBeDisabled();

			await fireEvent.click(getAllByTestId('tool-credential-picker-trigger-connect')[0]);
			await findAllByTestId('tool-credential-picker-row');
			await fireEvent.click(getByText('Brave key'));

			expect(connectWithCredentialMock).not.toHaveBeenCalled();
			expect(getByTestId('instance-ai-mcp-connect-resolve')).toBeDisabled();
		});

		it('opens the connection settings on row click', async () => {
			mcpStoreMock.mockReturnValue(makeMcpStore({ connections: [BRAVE_CONNECTION] }));

			const { getByText } = renderComponent({
				props: { servers: [BRAVE_PAYLOAD], readOnly: true },
			});

			await fireEvent.click(getByText('Brave Search'));

			expect(telemetryMock.trackSettingsOpened).toHaveBeenCalledWith('brave');
			expect(uiStoreMock.openModalWithData).toHaveBeenCalledWith({
				name: INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY,
				data: { connectionId: 'conn-1' },
			});
		});
	});

	it('offers no credential control for a never-connected row once read-only', () => {
		const { queryByTestId } = renderComponent({
			props: { servers: [BRAVE_PAYLOAD], readOnly: true },
		});

		expect(queryByTestId('tool-credential-picker-trigger-connect')).toBeNull();
		expect(queryByTestId('instance-ai-connection-row-status')).toBeNull();
	});
});
