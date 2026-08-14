import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import { SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT } from '@/app/constants/experiments';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { useSurfaceMcpToNewCloudUsersStore } from '../stores/surfaceMcpToNewCloudUsers.store';
import SurfaceMcpEmptyStateTile from './SurfaceMcpEmptyStateTile.vue';

const renderComponent = createComponentRenderer(SurfaceMcpEmptyStateTile);

describe('SurfaceMcpEmptyStateTile', () => {
	let pinia: ReturnType<typeof createTestingPinia>;
	let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;
	let mcpStore: ReturnType<typeof mockedStore<typeof useMCPStore>>;
	let surfaceMcpStore: ReturnType<typeof mockedStore<typeof useSurfaceMcpToNewCloudUsersStore>>;

	beforeEach(() => {
		pinia = createTestingPinia();
		uiStore = mockedStore(useUIStore);
		mcpStore = mockedStore(useMCPStore);
		surfaceMcpStore = mockedStore(useSurfaceMcpToNewCloudUsersStore);

		mcpStore.mcpAccessEnabled = false;
		surfaceMcpStore.currentVariant = SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT.variant1;
	});

	it('renders variant 1 CTA with a New badge', () => {
		surfaceMcpStore.currentVariant = SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT.variant1;

		const { getByTestId, queryByText } = renderComponent({ pinia });
		const card = getByTestId('mcp-onboarding-card');

		expect(card).toHaveTextContent('Build from your assistant');
		expect(getByTestId('mcp-onboarding-badge')).toHaveTextContent('New');
		expect(getByTestId('mcp-tile-logo-row')).toBeInTheDocument();
		expect(queryByText(/Connect MCP clients like Claude Code and Cursor/)).not.toBeInTheDocument();
	});

	it('renders variant 2 CTA with a New badge', () => {
		surfaceMcpStore.currentVariant = SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT.variant2;

		const { getByTestId, queryByText } = renderComponent({ pinia });
		const card = getByTestId('mcp-onboarding-card');

		expect(card).toHaveTextContent('Connect to your AI');
		expect(getByTestId('mcp-onboarding-badge')).toHaveTextContent('New');
		expect(getByTestId('mcp-tile-logo-row')).toBeInTheDocument();
		expect(queryByText(/Connect MCP clients like Claude Code and Cursor/)).not.toBeInTheDocument();
	});

	it('renders the Enabled badge when MCP access is enabled', () => {
		mcpStore.mcpAccessEnabled = true;

		const { getByTestId } = renderComponent({ pinia });

		expect(getByTestId('mcp-onboarding-badge')).toHaveTextContent('Enabled');
	});

	it('opens the onboarding modal when clicked', async () => {
		const user = userEvent.setup();
		const { getByTestId } = renderComponent({ pinia });

		await user.click(getByTestId('mcp-onboarding-card'));

		expect(surfaceMcpStore.trackOpened).toHaveBeenCalledWith('tile', {
			entryPoint: 'empty_state_tile',
			mcpAccessEnabled: false,
		});
		expect(uiStore.openModalWithData).toHaveBeenCalledWith({
			name: 'mcpOnboardingModal',
			data: { surface: 'tile' },
		});
	});
});
