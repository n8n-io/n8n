import { nextTick } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import SettingsMCPClientsView from '@/features/ai/mcpAccess/SettingsMCPClientsView.vue';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import type { FrontendSettings } from '@n8n/api-types';
import { MCP_SETTINGS_VIEW } from '@/features/ai/mcpAccess/mcp.constants';

const { routerPush, routerReplace } = vi.hoisted(() => ({
	routerPush: vi.fn(),
	routerReplace: vi.fn(),
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

const createComponent = createComponentRenderer(SettingsMCPClientsView, {
	global: {
		stubs: {
			OAuthClientsTable: {
				inheritAttrs: true,
				template:
					"<div>OAuth Clients Table<button data-test-id=\"stub-revoke-client\" @click=\"$emit('revokeClient', { id: 'client-1', name: 'Claude Code', owner: { id: 'user-2', firstName: 'Jane', lastName: 'Doe', email: 'jane@n8n.io' } })\">Revoke</button></div>",
			},
		},
	},
});

describe('SettingsMCPClientsView', () => {
	beforeEach(() => {
		pinia = createTestingPinia();
		mcpStore = mockedStore(useMCPStore);
		settingsStore = mockedStore(useSettingsStore);

		settingsStore.settings = {
			enterprise: {},
		} as FrontendSettings;

		settingsStore.moduleSettings = {
			mcp: {
				mcpAccessEnabled: true,
				mcpManagedByEnv: false,
			},
		};

		mcpStore.getAllOAuthClients.mockResolvedValue([]);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should redirect to the MCP settings view when MCP is disabled', async () => {
		settingsStore.moduleSettings = {
			mcp: {
				mcpAccessEnabled: false,
				mcpManagedByEnv: false,
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
});
