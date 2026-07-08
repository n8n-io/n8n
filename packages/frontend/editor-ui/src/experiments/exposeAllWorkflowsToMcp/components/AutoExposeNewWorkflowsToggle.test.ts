import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { useToast } from '@/app/composables/useToast';
import { useExposeAllWorkflowsToMcpStore } from '@/experiments/exposeAllWorkflowsToMcp/stores/exposeAllWorkflowsToMcp.store';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import AutoExposeNewWorkflowsToggle from './AutoExposeNewWorkflowsToggle.vue';

vi.mock('@/app/composables/useToast', () => {
	const showError = vi.fn();
	return {
		useToast: () => ({ showError }),
	};
});

const renderComponent = createComponentRenderer(AutoExposeNewWorkflowsToggle);

describe('AutoExposeNewWorkflowsToggle', () => {
	let pinia: ReturnType<typeof createTestingPinia>;
	let mcpStore: MockedStore<typeof useMCPStore>;
	let experimentStore: MockedStore<typeof useExposeAllWorkflowsToMcpStore>;
	let usersStore: MockedStore<typeof useUsersStore>;

	beforeEach(() => {
		vi.clearAllMocks();
		pinia = createTestingPinia();
		mcpStore = mockedStore(useMCPStore);
		experimentStore = mockedStore(useExposeAllWorkflowsToMcpStore);
		usersStore = mockedStore(useUsersStore);

		experimentStore.isEnabled = true;
		usersStore.isAdminOrOwner = true;
		mcpStore.mcpAutoExposeNewWorkflows = false;
	});

	it('renders nothing when the experiment is not enabled', () => {
		experimentStore.isEnabled = false;

		const { queryByTestId } = renderComponent({ pinia });

		expect(queryByTestId('mcp-auto-expose-toggle-container')).not.toBeInTheDocument();
	});

	it('renders the labelled toggle for enrolled users', () => {
		const { getByTestId, getByText } = renderComponent({ pinia });

		expect(getByTestId('mcp-auto-expose-toggle-container')).toBeInTheDocument();
		expect(getByText('Automatically enable new workflows')).toBeInTheDocument();
	});

	it('saves the setting and tracks telemetry when turned on', async () => {
		const user = userEvent.setup();
		mcpStore.setAutoExposeNewWorkflows.mockResolvedValue(true);

		const { getByRole } = renderComponent({ pinia });
		await user.click(getByRole('switch'));

		expect(mcpStore.setAutoExposeNewWorkflows).toHaveBeenCalledWith(true);
		expect(experimentStore.trackAutoExposeToggled).toHaveBeenCalledWith(true);
	});

	it('saves the setting when turned off', async () => {
		const user = userEvent.setup();
		mcpStore.mcpAutoExposeNewWorkflows = true;
		mcpStore.setAutoExposeNewWorkflows.mockResolvedValue(false);

		const { getByRole } = renderComponent({ pinia });
		await user.click(getByRole('switch'));

		expect(mcpStore.setAutoExposeNewWorkflows).toHaveBeenCalledWith(false);
		expect(experimentStore.trackAutoExposeToggled).toHaveBeenCalledWith(false);
	});

	it('disables the switch for non-admin users', () => {
		usersStore.isAdminOrOwner = false;

		const { getByRole } = renderComponent({ pinia });

		expect(getByRole('switch')).toBeDisabled();
	});

	it('shows an error toast and skips telemetry when saving fails', async () => {
		const user = userEvent.setup();
		const error = new Error('update failed');
		mcpStore.setAutoExposeNewWorkflows.mockRejectedValue(error);

		const { getByRole } = renderComponent({ pinia });
		await user.click(getByRole('switch'));

		expect(useToast().showError).toHaveBeenCalledWith(
			error,
			'Error updating automatic workflow enablement',
		);
		expect(experimentStore.trackAutoExposeToggled).not.toHaveBeenCalled();
	});
});
