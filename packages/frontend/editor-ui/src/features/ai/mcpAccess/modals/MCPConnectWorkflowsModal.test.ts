import { defineComponent, nextTick } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import MCPConnectWorkflowsModal from '@/features/ai/mcpAccess/modals/MCPConnectWorkflowsModal.vue';
import { MCP_CONNECT_WORKFLOWS_MODAL_KEY } from '@/features/ai/mcpAccess/mcp.constants';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { createWorkflow } from '@/features/ai/mcpAccess/mcp.test.utils';
import { useTelemetry } from '@/app/composables/useTelemetry';

vi.mock('@/app/composables/useTelemetry', () => {
	const track = vi.fn();
	return {
		useTelemetry: () => ({
			track,
		}),
	};
});

vi.mock('@/app/router', () => ({
	default: {
		resolve: vi.fn(({ name, params }) => {
			if (name === 'NodeViewExisting') {
				return { fullPath: `/workflows/${params.name}` };
			}
			if (name === 'ProjectsWorkflows') {
				return { fullPath: `/projects/${params.projectId}` };
			}
			return { fullPath: '/' };
		}),
	},
}));

const ModalStub = defineComponent({
	template: `
		<div>
			<slot name="content" />
			<slot name="footer" v-bind="{ close: closeFn }" />
		</div>
	`,
	emits: ['closed'],
	methods: {
		closeFn() {
			this.$emit('closed');
		},
	},
});

const initialState = {
	ui: {
		modalsById: {
			[MCP_CONNECT_WORKFLOWS_MODAL_KEY]: {
				open: true,
			},
		},
		modalStack: [MCP_CONNECT_WORKFLOWS_MODAL_KEY],
	},
};

const renderModal = createComponentRenderer(MCPConnectWorkflowsModal);

const telemetry = useTelemetry();

let pinia: ReturnType<typeof createTestingPinia>;
let mcpStore: MockedStore<typeof useMCPStore>;
let mockOnEnableMcpAccess: ReturnType<typeof vi.fn>;

describe('MCPConnectWorkflowsModal', () => {
	beforeEach(() => {
		pinia = createTestingPinia({ initialState });
		mcpStore = mockedStore(useMCPStore);
		mcpStore.getMcpEligibleWorkflows.mockResolvedValue({
			count: 0,
			data: [],
		});
		mockOnEnableMcpAccess = vi.fn().mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const createProps = (overrides = {}) => ({
		data: {
			onEnableMcpAccess: mockOnEnableMcpAccess,
			...overrides,
		},
	});

	describe('Initial rendering', () => {
		it('should render the modal with info notice', async () => {
			const { getByTestId } = renderModal({
				pinia,
				props: createProps(),
				global: { stubs: { Modal: ModalStub } },
			});
			await nextTick();

			expect(getByTestId('mcp-connect-workflows-info-notice')).toBeInTheDocument();
		});

		it('should render workflow select component', async () => {
			const { getByTestId } = renderModal({
				pinia,
				props: createProps(),
				global: { stubs: { Modal: ModalStub } },
			});
			await nextTick();

			expect(getByTestId('mcp-workflows-select')).toBeInTheDocument();
		});

		it('should render cancel and save buttons', async () => {
			const { getByTestId } = renderModal({
				pinia,
				props: createProps(),
				global: { stubs: { Modal: ModalStub } },
			});
			await nextTick();

			expect(getByTestId('mcp-connect-workflows-cancel-button')).toBeInTheDocument();
			expect(getByTestId('mcp-connect-workflows-save-button')).toBeInTheDocument();
		});

		it('should have save button disabled when no workflow is selected', async () => {
			const { getByTestId } = renderModal({
				pinia,
				props: createProps(),
				global: { stubs: { Modal: ModalStub } },
			});
			await nextTick();

			expect(getByTestId('mcp-connect-workflows-save-button')).toBeDisabled();
		});
	});

	describe('Workflow selection', () => {
		it('should enable save button when workflow is selected', async () => {
			const workflows = [createWorkflow({ id: 'wf-1', name: 'Test Workflow' })];
			mcpStore.getMcpEligibleWorkflows.mockResolvedValue({
				count: 1,
				data: workflows,
			});

			const { getByTestId } = renderModal({
				pinia,
				props: createProps(),
				global: { stubs: { Modal: ModalStub } },
			});
			await nextTick();

			// Wait for workflows to load
			await waitFor(() => {
				expect(mcpStore.getMcpEligibleWorkflows).toHaveBeenCalled();
			});

			const select = getByTestId('mcp-workflows-select');
			await userEvent.click(select);

			await waitFor(() => {
				const options = document.querySelectorAll('.el-select-dropdown__item');
				expect(options.length).toBe(1);
			});

			const option = document.querySelector('.el-select-dropdown__item');
			if (option) {
				await userEvent.click(option);
			}

			await waitFor(() => {
				expect(getByTestId('mcp-connect-workflows-save-button')).not.toBeDisabled();
			});
		});
	});

	describe('Save action', () => {
		it('should call onEnableMcpAccess with selected workflow id when save is clicked', async () => {
			const workflows = [createWorkflow({ id: 'wf-1', name: 'Test Workflow' })];
			mcpStore.getMcpEligibleWorkflows.mockResolvedValue({
				count: 1,
				data: workflows,
			});

			const { getByTestId } = renderModal({
				pinia,
				props: createProps(),
				global: { stubs: { Modal: ModalStub } },
			});
			await nextTick();

			await waitFor(() => {
				expect(mcpStore.getMcpEligibleWorkflows).toHaveBeenCalled();
			});

			const select = getByTestId('mcp-workflows-select');
			await userEvent.click(select);

			await waitFor(() => {
				const options = document.querySelectorAll('.el-select-dropdown__item');
				expect(options.length).toBe(1);
			});

			const option = document.querySelector('.el-select-dropdown__item');
			if (option) {
				await userEvent.click(option);
			}

			await waitFor(() => {
				expect(getByTestId('mcp-connect-workflows-save-button')).not.toBeDisabled();
			});

			await userEvent.click(getByTestId('mcp-connect-workflows-save-button'));

			await waitFor(() => {
				expect(mockOnEnableMcpAccess).toHaveBeenCalledWith('wf-1');
			});
		});

		it('should track telemetry event when workflow is selected and saved', async () => {
			const workflows = [createWorkflow({ id: 'wf-1', name: 'Test Workflow' })];
			mcpStore.getMcpEligibleWorkflows.mockResolvedValue({
				count: 1,
				data: workflows,
			});

			const { getByTestId } = renderModal({
				pinia,
				props: createProps(),
				global: { stubs: { Modal: ModalStub } },
			});
			await nextTick();

			await waitFor(() => {
				expect(mcpStore.getMcpEligibleWorkflows).toHaveBeenCalled();
			});

			const select = getByTestId('mcp-workflows-select');
			await userEvent.click(select);

			await waitFor(() => {
				const options = document.querySelectorAll('.el-select-dropdown__item');
				expect(options.length).toBe(1);
			});

			const option = document.querySelector('.el-select-dropdown__item');
			if (option) {
				await userEvent.click(option);
			}

			await waitFor(() => {
				expect(getByTestId('mcp-connect-workflows-save-button')).not.toBeDisabled();
			});

			await userEvent.click(getByTestId('mcp-connect-workflows-save-button'));

			await waitFor(() => {
				expect(telemetry.track).toHaveBeenCalledWith('User selected workflow from list', {
					workflowId: 'wf-1',
				});
			});
		});
	});

	describe('Cancel action', () => {
		it('should track telemetry event when cancel is clicked', async () => {
			const { getByTestId } = renderModal({
				pinia,
				props: createProps(),
				global: { stubs: { Modal: ModalStub } },
			});
			await nextTick();

			await userEvent.click(getByTestId('mcp-connect-workflows-cancel-button'));

			expect(telemetry.track).toHaveBeenCalledWith('User dismissed mcp workflows dialog');
		});
	});

	describe('Loading state', () => {
		it('should disable buttons while saving', async () => {
			const workflows = [createWorkflow({ id: 'wf-1', name: 'Test Workflow' })];
			mcpStore.getMcpEligibleWorkflows.mockResolvedValue({
				count: 1,
				data: workflows,
			});

			// Create a promise that doesn't resolve immediately
			let resolvePromise: (value?: unknown) => void;
			mockOnEnableMcpAccess.mockImplementation(
				async () =>
					await new Promise((resolve) => {
						resolvePromise = resolve;
					}),
			);

			const { getByTestId } = renderModal({
				pinia,
				props: createProps(),
				global: { stubs: { Modal: ModalStub } },
			});
			await nextTick();

			await waitFor(() => {
				expect(mcpStore.getMcpEligibleWorkflows).toHaveBeenCalled();
			});

			const select = getByTestId('mcp-workflows-select');
			await userEvent.click(select);

			await waitFor(() => {
				const options = document.querySelectorAll('.el-select-dropdown__item');
				expect(options.length).toBe(1);
			});

			const option = document.querySelector('.el-select-dropdown__item');
			if (option) {
				await userEvent.click(option);
			}

			await waitFor(() => {
				expect(getByTestId('mcp-connect-workflows-save-button')).not.toBeDisabled();
			});

			await userEvent.click(getByTestId('mcp-connect-workflows-save-button'));

			// While saving, buttons should be disabled
			await waitFor(() => {
				expect(getByTestId('mcp-connect-workflows-cancel-button')).toBeDisabled();
				expect(getByTestId('mcp-connect-workflows-save-button')).toBeDisabled();
			});

			// Resolve the promise
			resolvePromise!();
		});
	});
});
