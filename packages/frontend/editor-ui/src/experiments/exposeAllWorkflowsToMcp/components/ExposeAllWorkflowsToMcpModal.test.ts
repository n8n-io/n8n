import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { useToast } from '@n8n/composables/useToast';
import { EXPOSE_ALL_WORKFLOWS_TO_MCP_MODAL_KEY } from '@/experiments/exposeAllWorkflowsToMcp/constants';
import { useExposeAllWorkflowsToMcpStore } from '@/experiments/exposeAllWorkflowsToMcp/stores/exposeAllWorkflowsToMcp.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import ExposeAllWorkflowsToMcpModal from './ExposeAllWorkflowsToMcpModal.vue';

const { trackAutoExposeToggledSpy } = vi.hoisted(() => ({
	trackAutoExposeToggledSpy: vi.fn(),
}));

vi.mock('@/features/ai/mcpAccess/composables/useMcp', () => ({
	useMcp: () => ({ trackAutoExposeToggled: trackAutoExposeToggledSpy }),
}));

vi.mock('@n8n/composables/useToast', () => {
	const showMessage = vi.fn();
	const showError = vi.fn();
	return {
		useToast: () => ({ showMessage, showError }),
	};
});

const renderComponent = createComponentRenderer(ExposeAllWorkflowsToMcpModal);

describe('ExposeAllWorkflowsToMcpModal', () => {
	let pinia: ReturnType<typeof createTestingPinia>;
	let mcpStore: MockedStore<typeof useMCPStore>;
	let experimentStore: MockedStore<typeof useExposeAllWorkflowsToMcpStore>;

	const defaultProps = { data: { onExposed: vi.fn() } };

	async function renderOpen(props: typeof defaultProps) {
		const rendered = renderComponent({ pinia, props });
		await rendered.findByTestId('expose-all-workflows-mcp-description');
		return rendered;
	}

	beforeEach(() => {
		vi.clearAllMocks();
		pinia = createTestingPinia();
		mcpStore = mockedStore(useMCPStore);
		experimentStore = mockedStore(useExposeAllWorkflowsToMcpStore);

		mcpStore.toggleWorkflowsMcpAccess.mockResolvedValue({
			updatedCount: 3,
			unchangedCount: 0,
			skippedCount: 0,
			failedCount: 0,
		});

		mcpStore.setAutoExposeNewWorkflows.mockResolvedValue(true);

		const uiStore = useUIStore();
		uiStore.modalStateById[EXPOSE_ALL_WORKFLOWS_TO_MCP_MODAL_KEY] = { open: true };
	});

	it('renders the copy and both actions', async () => {
		const { getByText, getByTestId } = await renderOpen(defaultProps);

		expect(getByText('Enable MCP access for all workflows?')).toBeInTheDocument();
		expect(getByTestId('expose-all-workflows-mcp-description')).toBeInTheDocument();
		expect(getByTestId('expose-all-workflows-mcp-not-now-button')).toBeInTheDocument();
		expect(getByTestId('expose-all-workflows-mcp-confirm-button')).toBeInTheDocument();
	});

	it('exposes all workflows and tracks confirmation on confirm', async () => {
		const user = userEvent.setup();
		const onExposed = vi.fn();
		const { getByTestId } = await renderOpen({ data: { onExposed } });

		await user.click(getByTestId('expose-all-workflows-mcp-confirm-button'));

		expect(mcpStore.toggleWorkflowsMcpAccess).toHaveBeenCalledWith({ allWorkflows: true }, true);
		expect(experimentStore.trackConfirmed).toHaveBeenCalled();
		expect(useToast().showMessage).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'success' }),
		);
		expect(onExposed).toHaveBeenCalled();
		// The confirm flow closes the modal; that close must not count as a dismissal
		expect(experimentStore.trackDismissed).not.toHaveBeenCalled();
	});

	it('tracks decline without exposing workflows on Not now', async () => {
		const user = userEvent.setup();
		const { getByTestId } = await renderOpen(defaultProps);

		await user.click(getByTestId('expose-all-workflows-mcp-not-now-button'));

		expect(experimentStore.trackDeclined).toHaveBeenCalled();
		expect(mcpStore.toggleWorkflowsMcpAccess).not.toHaveBeenCalled();
		expect(experimentStore.trackDismissed).not.toHaveBeenCalled();
	});

	it('tracks dismissal when the modal is closed without an action', async () => {
		const user = userEvent.setup();
		const { getByTestId } = await renderOpen(defaultProps);

		await user.click(getByTestId('dialog-close-button'));

		expect(experimentStore.trackDismissed).toHaveBeenCalled();
		expect(experimentStore.trackDeclined).not.toHaveBeenCalled();
		expect(mcpStore.toggleWorkflowsMcpAccess).not.toHaveBeenCalled();
	});

	it('shows an error toast and keeps the modal actionable when exposing fails', async () => {
		const user = userEvent.setup();
		mcpStore.toggleWorkflowsMcpAccess.mockRejectedValue(new Error('boom'));
		const { getByTestId } = await renderOpen(defaultProps);

		await user.click(getByTestId('expose-all-workflows-mcp-confirm-button'));

		expect(useToast().showError).toHaveBeenCalled();
		expect(experimentStore.trackConfirmed).not.toHaveBeenCalled();
	});

	it('enables auto-expose only after exposing all workflows succeeds', async () => {
		const user = userEvent.setup();
		const { getByTestId } = await renderOpen(defaultProps);

		await user.click(getByTestId('expose-all-workflows-mcp-confirm-button'));

		expect(mcpStore.toggleWorkflowsMcpAccess).toHaveBeenCalledWith({ allWorkflows: true }, true);
		expect(mcpStore.setAutoExposeNewWorkflows).toHaveBeenCalledWith(true);
		expect(trackAutoExposeToggledSpy).toHaveBeenCalledWith({ enabled: true, source: 'expose_all' });
	});
});
