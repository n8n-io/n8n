import { nextTick } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import SettingsMCPClientsView from '@/features/ai/mcpAccess/SettingsMCPClientsView.vue';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { mock } from 'vitest-mock-extended';
import type { IUser } from '@n8n/rest-api-client/api/users';
import type { FrontendSettings } from '@n8n/api-types';
import { MCP_SETTINGS_VIEW } from '@/features/ai/mcpAccess/mcp.constants';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

const { routerPush, routerReplace } = vi.hoisted(() => ({
	routerPush: vi.fn(),
	routerReplace: vi.fn(),
}));

const { trackSpy } = vi.hoisted(() => ({ trackSpy: vi.fn() }));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackSpy }),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRouter: () => ({ push: routerPush, replace: routerReplace }),
	useRoute: vi.fn(() => ({
		params: {},
	})),
	RouterLink: {
		template: '<a><slot /></a>',
	},
}));

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({
		set: vi.fn(),
	}),
}));

let pinia: ReturnType<typeof createTestingPinia>;
let mcpStore: MockedStore<typeof useMCPStore>;
let settingsStore: MockedStore<typeof useSettingsStore>;
let usersStore: MockedStore<typeof useUsersStore>;

const createComponent = createComponentRenderer(SettingsMCPClientsView, {
	global: {
		stubs: {
			OAuthClientsTable: {
				inheritAttrs: true,
				template:
					"<div>OAuth Clients Table<button data-test-id=\"stub-revoke-client\" @click=\"$emit('revokeClient', { id: 'client-1', name: 'Claude Code', owner: { id: 'user-2', firstName: 'Jane', lastName: 'Doe', email: 'jane@n8n.io' } })\">Revoke</button><button data-test-id=\"stub-ownership-all\" @click=\"$emit('update:ownership', 'all')\">All</button></div>",
			},
		},
	},
});

describe('SettingsMCPClientsView', () => {
	beforeEach(() => {
		pinia = createTestingPinia();
		mcpStore = mockedStore(useMCPStore);
		settingsStore = mockedStore(useSettingsStore);
		usersStore = mockedStore(useUsersStore);

		// The stub row's consent belongs to user-2, so a different current user is
		// what makes revoked_for_other meaningful rather than trivially true.
		usersStore.currentUser = mock<IUser>({ id: 'user-1' });

		settingsStore.settings = {
			enterprise: {},
		} as FrontendSettings;

		settingsStore.moduleSettings = {
			mcp: {
				mcpAccessEnabled: true,
				mcpManagedByEnv: false,
				autoExposeNewWorkflows: false,
			},
		};

		mcpStore.getAllOAuthClients.mockResolvedValue([]);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const revokeAndConfirm = async (getByTestId: (id: string) => HTMLElement) => {
		await userEvent.click(getByTestId('stub-revoke-client'));

		await waitFor(() => {
			expect(
				within(document.body).getByText('Revoke access for "Claude Code"?'),
			).toBeInTheDocument();
		});

		await userEvent.click(within(document.body).getByRole('button', { name: 'Revoke' }));
	};

	it('should redirect to the MCP settings view when MCP is disabled', async () => {
		settingsStore.moduleSettings = {
			mcp: {
				mcpAccessEnabled: false,
				mcpManagedByEnv: false,
				autoExposeNewWorkflows: false,
			},
		};

		createComponent({ pinia });
		await nextTick();

		expect(routerReplace).toHaveBeenCalledWith({ name: MCP_SETTINGS_VIEW });
		expect(mcpStore.getAllOAuthClients).not.toHaveBeenCalled();
	});

	it('should fetch the clients on mount and render the table', async () => {
		const { getByTestId } = createComponent({ pinia });
		await nextTick();

		expect(getByTestId('mcp-oauth-clients-table')).toBeVisible();
		expect(mcpStore.getAllOAuthClients).toHaveBeenCalled();
	});

	it('should confirm before revoking and pass the consent owner to the store', async () => {
		const { getByTestId } = createComponent({ pinia });
		await nextTick();

		await userEvent.click(getByTestId('stub-revoke-client'));

		// nothing is revoked until the dialog is confirmed
		await waitFor(() => {
			expect(
				within(document.body).getByText('Revoke access for "Claude Code"?'),
			).toBeInTheDocument();
		});
		expect(mcpStore.removeOAuthClient).not.toHaveBeenCalled();

		await userEvent.click(within(document.body).getByRole('button', { name: 'Revoke' }));

		await waitFor(() => {
			expect(mcpStore.removeOAuthClient).toHaveBeenCalledWith('client-1', 'user-2');
		});
	});

	it('should track the revoke once it succeeds, not when the dialog opens', async () => {
		const { getByTestId } = createComponent({ pinia });
		await nextTick();

		await userEvent.click(getByTestId('stub-revoke-client'));

		await waitFor(() => {
			expect(
				within(document.body).getByText('Revoke access for "Claude Code"?'),
			).toBeInTheDocument();
		});
		expect(trackSpy).not.toHaveBeenCalledWith(
			TELEMETRY_EVENT.MCP.USER_REVOKED_MCP_CLIENT_ACCESS,
			expect.anything(),
		);

		await userEvent.click(within(document.body).getByRole('button', { name: 'Revoke' }));

		await waitFor(() => {
			expect(trackSpy).toHaveBeenCalledWith(TELEMETRY_EVENT.MCP.USER_REVOKED_MCP_CLIENT_ACCESS, {
				client_id: 'client-1',
				client_brand: 'claude',
				client_type: 'cli',
				revoked_for_other: true,
			});
		});
	});

	it("should report revoked_for_other as false when the grant is the current user's own", async () => {
		usersStore.currentUser = mock<IUser>({ id: 'user-2' });

		const { getByTestId } = createComponent({ pinia });
		await nextTick();

		await revokeAndConfirm(getByTestId);

		await waitFor(() => {
			expect(trackSpy).toHaveBeenCalledWith(
				TELEMETRY_EVENT.MCP.USER_REVOKED_MCP_CLIENT_ACCESS,
				expect.objectContaining({ revoked_for_other: false }),
			);
		});
	});

	it('should track the switch to the instance-wide clients tab', async () => {
		const { getByTestId } = createComponent({ pinia });
		await nextTick();

		expect(trackSpy).not.toHaveBeenCalledWith(
			TELEMETRY_EVENT.MCP.USER_VIEWED_ALL_MCP_CLIENTS,
			expect.anything(),
		);

		await userEvent.click(getByTestId('stub-ownership-all'));

		await waitFor(() => {
			expect(trackSpy).toHaveBeenCalledWith(TELEMETRY_EVENT.MCP.USER_VIEWED_ALL_MCP_CLIENTS, {});
		});
	});
});
