import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { useToast } from '@n8n/composables/useToast';
import { useExposeAllWorkflowsToMcpStore } from '@/experiments/exposeAllWorkflowsToMcp/stores/exposeAllWorkflowsToMcp.store';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { defineComponent } from 'vue';
import ExposeAllWorkflowsToMcpModal from './ExposeAllWorkflowsToMcpModal.vue';

const { trackSpy } = vi.hoisted(() => ({
	trackSpy: vi.fn(),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackSpy }),
}));

vi.mock('@n8n/composables/useToast', () => {
	const showMessage = vi.fn();
	const showError = vi.fn();
	return {
		useToast: () => ({ showMessage, showError }),
	};
});

const ModalStub = defineComponent({
	props: ['name', 'title', 'eventBus'],
	methods: {
		close() {
			this.eventBus.emit('closed');
		},
	},
	template: `
		<div :data-test-id="name">
			<h1>{{ title }}</h1>
			<slot name="content" />
			<slot name="footer" :close="close" />
			<button data-test-id="expose-all-workflows-mcp-generic-close" @click="eventBus.emit('closed')" />
		</div>
	`,
});

const renderComponent = createComponentRenderer(ExposeAllWorkflowsToMcpModal, {
	global: {
		stubs: {
			Modal: ModalStub,
		},
	},
});

describe('ExposeAllWorkflowsToMcpModal', () => {
	let pinia: ReturnType<typeof createTestingPinia>;
	let mcpStore: MockedStore<typeof useMCPStore>;
	let experimentStore: MockedStore<typeof useExposeAllWorkflowsToMcpStore>;

	const defaultProps = { data: { onExposed: vi.fn() } };

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
		// Mirrors the real store's local-state-only write so component tests can
		// observe it landing in settingsStore, without exercising a network call.
		mcpStore.applyAutoExposeNewWorkflowsLocally.mockImplementation((enabled: boolean) => {
			const settingsStore = useSettingsStore();
			settingsStore.moduleSettings.mcp = {
				mcpAccessEnabled: false,
				mcpManagedByEnv: false,
				...(settingsStore.moduleSettings.mcp ?? {}),
				autoExposeNewWorkflows: enabled,
			};
		});
	});

	it('renders the copy and both actions', () => {
		const { getByText, getByTestId } = renderComponent({ pinia, props: defaultProps });

		expect(getByText('Expose all workflows to MCP?')).toBeInTheDocument();
		expect(getByTestId('expose-all-workflows-mcp-description')).toBeInTheDocument();
		expect(getByTestId('expose-all-workflows-mcp-not-now-button')).toBeInTheDocument();
		expect(getByTestId('expose-all-workflows-mcp-confirm-button')).toBeInTheDocument();
	});

	it('exposes all workflows and tracks confirmation on confirm', async () => {
		const user = userEvent.setup();
		const onExposed = vi.fn();
		const { getByTestId } = renderComponent({ pinia, props: { data: { onExposed } } });

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
		const { getByTestId } = renderComponent({ pinia, props: defaultProps });

		await user.click(getByTestId('expose-all-workflows-mcp-not-now-button'));

		expect(experimentStore.trackDeclined).toHaveBeenCalled();
		expect(mcpStore.toggleWorkflowsMcpAccess).not.toHaveBeenCalled();
		expect(experimentStore.trackDismissed).not.toHaveBeenCalled();
	});

	it('tracks dismissal when the modal is closed without an action', async () => {
		const user = userEvent.setup();
		const { getByTestId } = renderComponent({ pinia, props: defaultProps });

		await user.click(getByTestId('expose-all-workflows-mcp-generic-close'));

		expect(experimentStore.trackDismissed).toHaveBeenCalled();
		expect(experimentStore.trackDeclined).not.toHaveBeenCalled();
		expect(mcpStore.toggleWorkflowsMcpAccess).not.toHaveBeenCalled();
	});

	it('shows an error toast and keeps the modal actionable when exposing fails', async () => {
		const user = userEvent.setup();
		mcpStore.toggleWorkflowsMcpAccess.mockRejectedValue(new Error('boom'));
		const { getByTestId } = renderComponent({ pinia, props: defaultProps });

		await user.click(getByTestId('expose-all-workflows-mcp-confirm-button'));

		expect(useToast().showError).toHaveBeenCalled();
		expect(experimentStore.trackConfirmed).not.toHaveBeenCalled();
	});

	it('syncs local MCP settings state when the response confirms auto-expose', async () => {
		mcpStore.toggleWorkflowsMcpAccess.mockResolvedValue({
			updatedCount: 3,
			unchangedCount: 0,
			skippedCount: 0,
			failedCount: 0,
			autoExposeNewWorkflows: true,
		});
		const settingsStore = useSettingsStore();
		settingsStore.moduleSettings.mcp = {
			mcpAccessEnabled: true,
			mcpManagedByEnv: false,
			autoExposeNewWorkflows: false,
		};

		const user = userEvent.setup();
		const { getByTestId } = renderComponent({ pinia, props: defaultProps });

		await user.click(getByTestId('expose-all-workflows-mcp-confirm-button'));

		expect(mcpStore.applyAutoExposeNewWorkflowsLocally).toHaveBeenCalledWith(true);
		expect(settingsStore.moduleSettings.mcp?.autoExposeNewWorkflows).toBe(true);
		// Sibling keys must survive the sync.
		expect(settingsStore.moduleSettings.mcp?.mcpAccessEnabled).toBe(true);
	});
});
