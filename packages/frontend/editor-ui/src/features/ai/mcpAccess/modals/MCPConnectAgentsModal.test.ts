import { defineComponent, h } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import MCPConnectAgentsModal from '@/features/ai/mcpAccess/modals/MCPConnectAgentsModal.vue';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { type Mock } from 'vitest';

vi.mock('@n8n/composables/useTelemetry', () => {
	const track = vi.fn();
	return {
		useTelemetry: () => ({
			track,
		}),
	};
});

// Replaces the remote-search select with a button that selects one agent.
const MCPAgentsSelectStub = defineComponent({
	props: { modelValue: { type: Array, default: () => [] } },
	emits: ['update:modelValue'],
	setup(props, { emit }) {
		return () =>
			h(
				'button',
				{
					'data-test-id': 'mcp-agents-select-stub',
					onClick: () => emit('update:modelValue', ['agent-1']),
				},
				props.modelValue.join(','),
			);
	},
});

const renderModal = createComponentRenderer(MCPConnectAgentsModal, {
	global: {
		stubs: { MCPAgentsSelect: MCPAgentsSelectStub },
	},
});

const telemetry = useTelemetry();

let mockEnableMcpAccess: Mock;

describe('MCPConnectAgentsModal', () => {
	beforeEach(() => {
		mockEnableMcpAccess = vi.fn().mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const renderOpen = () =>
		renderModal({
			pinia: createTestingPinia(),
			props: { open: true, enableMcpAccess: mockEnableMcpAccess },
		});

	it('should enable access, track the selection and close on save', async () => {
		const { getByTestId, findByTestId, emitted } = renderOpen();

		await userEvent.click(await findByTestId('mcp-agents-select-stub'));
		await userEvent.click(getByTestId('mcp-connect-agents-save-button'));

		await waitFor(() => expect(emitted()['update:open']).toEqual([[false]]));
		expect(mockEnableMcpAccess).toHaveBeenCalledWith(['agent-1']);
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.USER_SELECTED_AGENTS_FOR_MCP,
			{ agentIds: ['agent-1'], count: 1 },
		);
		expect(telemetry.track).not.toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.USER_DISMISSED_MCP_AGENTS_DIALOG,
			{},
		);
	});

	it('should close and track a dismissal on cancel', async () => {
		const { findByTestId, emitted, rerender } = renderOpen();

		await userEvent.click(await findByTestId('mcp-connect-agents-cancel-button'));
		expect(emitted()['update:open']).toEqual([[false]]);

		// The parent applies the v-model update.
		await rerender({ open: false });

		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.USER_DISMISSED_MCP_AGENTS_DIALOG,
			{},
		);
	});

	it('should track a dismissal when the parent closes it without an action', async () => {
		const { rerender } = renderOpen();

		await rerender({ open: false });

		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.USER_DISMISSED_MCP_AGENTS_DIALOG,
			{},
		);
	});

	it('should start from an empty selection when reopened', async () => {
		const { getByTestId, findByTestId, rerender } = renderOpen();

		await userEvent.click(await findByTestId('mcp-agents-select-stub'));
		expect(getByTestId('mcp-connect-agents-save-button')).toBeEnabled();

		await rerender({ open: false });
		await rerender({ open: true });

		await waitFor(() => expect(getByTestId('mcp-connect-agents-save-button')).toBeDisabled());
		expect(getByTestId('mcp-agents-select-stub')).toHaveTextContent('');
	});

	it('should stay open without tracking when enabling access fails', async () => {
		const error = new Error('network');
		mockEnableMcpAccess.mockRejectedValue(error);
		// The view shows the error; the rejection only has to keep the modal open.
		const errorHandler = vi.fn();
		const { getByTestId, findByTestId, emitted } = renderModal({
			pinia: createTestingPinia(),
			props: { open: true, enableMcpAccess: mockEnableMcpAccess },
			global: { config: { errorHandler } },
		});

		await userEvent.click(await findByTestId('mcp-agents-select-stub'));
		await userEvent.click(getByTestId('mcp-connect-agents-save-button'));

		await waitFor(() => {
			expect(getByTestId('mcp-connect-agents-save-button')).toBeEnabled();
			expect(getByTestId('mcp-connect-agents-cancel-button')).toBeEnabled();
		});
		expect(errorHandler).toHaveBeenCalledWith(error, expect.anything(), expect.any(String));
		expect(emitted()['update:open']).toBeUndefined();
		expect(telemetry.track).not.toHaveBeenCalled();
	});
});
