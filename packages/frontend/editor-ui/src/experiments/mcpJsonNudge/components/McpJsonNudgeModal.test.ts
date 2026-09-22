import { createComponentRenderer } from '@/__tests__/render';
import type { McpJsonNudgeAction } from '@/experiments/mcpJsonNudge/composables/useMcpJsonNudgeTrigger';
import type { McpJsonNudgeSurface } from '@/experiments/mcpJsonNudge/constants';
import { MCP_SETTINGS_VIEW } from '@/features/ai/mcpAccess/mcp.constants';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import userEvent from '@testing-library/user-event';
import type { Mock } from 'vitest';
import { defineComponent } from 'vue';
import McpJsonNudgeModal from './McpJsonNudgeModal.vue';

const routerPushMock = vi.hoisted(() => vi.fn());
const closeMock = vi.hoisted(() => vi.fn());
const dismissForeverMock = vi.hoisted(() => vi.fn());
const trackMock = vi.hoisted(() => vi.fn());

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRouter: () => ({ push: routerPushMock }),
}));

vi.mock('@/experiments/mcpJsonNudge/composables/useMcpJsonNudgeEligibility', () => ({
	useMcpJsonNudgeEligibility: () => ({ dismissForever: dismissForeverMock }),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackMock }),
}));

// Mirrors the real Modal: the footer `close` fn closes the modal, and every
// close (button or × / esc) emits 'closed' on the modal's event bus.
const ModalStub = defineComponent({
	props: ['name', 'title', 'eventBus'],
	methods: {
		close() {
			closeMock();
			this.eventBus?.emit('closed');
		},
	},
	template: `
		<div :data-test-id="name">
			<h1>{{ title }}</h1>
			<slot name="content" />
			<slot name="footer" :close="close" />
			<button data-test-id="mcp-json-nudge-generic-close" @click="eventBus.emit('closed')" />
		</div>
	`,
});

const McpClientLogoCardsStub = defineComponent({
	template: '<div data-test-id="mcp-json-nudge-logo-cards" />',
});

const renderComponent = createComponentRenderer(McpJsonNudgeModal, {
	global: {
		stubs: {
			Modal: ModalStub,
			McpClientLogoCards: McpClientLogoCardsStub,
		},
	},
});

describe('McpJsonNudgeModal', () => {
	let onContinue: Mock<McpJsonNudgeAction>;

	beforeEach(() => {
		routerPushMock.mockClear();
		closeMock.mockClear();
		dismissForeverMock.mockClear();
		trackMock.mockClear();
		onContinue = vi.fn<McpJsonNudgeAction>();
	});

	const renderWith = (surface: McpJsonNudgeSurface = 'export') =>
		renderComponent({ props: { data: { surface, onContinue } } });

	it.each([
		['export', 'Exporting this for an AI tool?'],
		['import_file', 'Importing this from an AI tool?'],
		['import_url', 'Importing this from an AI tool?'],
		['copy', 'Copying this for an AI tool?'],
		['paste', 'Pasting this from an AI tool?'],
	] as const)('shows the right header for the %s surface', (surface, expectedTitle) => {
		const { getByText } = renderWith(surface);

		expect(getByText(expectedTitle)).toBeInTheDocument();
	});

	it('renders the logo cards, body copy, and both actions', () => {
		const { getByTestId, getByText } = renderWith();

		expect(getByTestId('mcp-json-nudge-logo-cards')).toBeInTheDocument();
		expect(
			getByText(
				"Add n8n's MCP connector so that Claude, ChatGPT, or any AI tool can build, edit, and debug this workflow directly",
			),
		).toBeInTheDocument();
		expect(getByTestId('mcp-json-nudge-skip-button')).toBeInTheDocument();
		expect(getByTestId('mcp-json-nudge-connect-button')).toBeInTheDocument();
		expect(getByTestId('mcp-json-nudge-dont-show-again')).toBeInTheDocument();
	});

	it('continues the original action once, closes, and tracks the skip when Skip is clicked', async () => {
		const user = userEvent.setup();
		const { getByTestId } = renderWith('import_url');

		await user.click(getByTestId('mcp-json-nudge-skip-button'));

		expect(onContinue).toHaveBeenCalledTimes(1);
		expect(closeMock).toHaveBeenCalled();
		expect(routerPushMock).not.toHaveBeenCalled();
		expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.MCP.MCP_NUDGE_SKIPPED, {
			surface: 'import_url',
		});
		expect(trackMock).not.toHaveBeenCalledWith(
			TELEMETRY_EVENT.MCP.MCP_NUDGE_DISMISSED,
			expect.anything(),
		);
	});

	it('abandons the original action, navigates to MCP settings, closes, and tracks the connect click when Connect n8n is clicked', async () => {
		const user = userEvent.setup();
		const { getByTestId } = renderWith();

		await user.click(getByTestId('mcp-json-nudge-connect-button'));

		expect(routerPushMock).toHaveBeenCalledWith({ name: MCP_SETTINGS_VIEW });
		expect(closeMock).toHaveBeenCalled();
		expect(onContinue).not.toHaveBeenCalled();
		expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.MCP.MCP_NUDGE_CONNECT_CLICKED, {
			surface: 'export',
		});
	});

	it('continues the original action once and tracks the dismissal when closed without an action (× / esc)', async () => {
		const user = userEvent.setup();
		const { getByTestId } = renderWith();

		await user.click(getByTestId('mcp-json-nudge-generic-close'));

		expect(onContinue).toHaveBeenCalledTimes(1);
		expect(routerPushMock).not.toHaveBeenCalled();
		expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.MCP.MCP_NUDGE_DISMISSED, {
			surface: 'export',
		});
		expect(trackMock).not.toHaveBeenCalledWith(
			TELEMETRY_EVENT.MCP.MCP_NUDGE_SKIPPED,
			expect.anything(),
		);
	});

	it('dismisses the nudge forever and tracks the opt-out when "Don\'t show this again" is checked', async () => {
		const user = userEvent.setup();
		const { getByTestId } = renderWith();

		await user.click(getByTestId('mcp-json-nudge-dont-show-again'));

		expect(dismissForeverMock).toHaveBeenCalled();
		expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.MCP.MCP_NUDGE_OPTED_OUT, {
			surface: 'export',
		});
	});
});
