import { createComponentRenderer } from '@/__tests__/render';
import { MCP_SETTINGS_VIEW } from '@/features/ai/mcpAccess/mcp.constants';
import userEvent from '@testing-library/user-event';
import { defineComponent } from 'vue';
import McpJsonNudgeModal from './McpJsonNudgeModal.vue';

const routerPushMock = vi.hoisted(() => vi.fn());
const closeMock = vi.hoisted(() => vi.fn());

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRouter: () => ({ push: routerPushMock }),
}));

const ModalStub = defineComponent({
	props: ['name', 'title'],
	setup() {
		return { close: closeMock };
	},
	template: `
		<div :data-test-id="name">
			<h1>{{ title }}</h1>
			<slot name="content" />
			<slot name="footer" :close="close" />
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
	beforeEach(() => {
		routerPushMock.mockClear();
		closeMock.mockClear();
	});

	it.each([
		['export', 'Exporting this for an AI tool?'],
		['import_file', 'Importing this from an AI tool?'],
		['import_url', 'Importing this from an AI tool?'],
	] as const)('shows the right header for the %s surface', (surface, expectedTitle) => {
		const { getByText } = renderComponent({ props: { data: { surface } } });

		expect(getByText(expectedTitle)).toBeInTheDocument();
	});

	it('renders the logo cards, body copy, and both actions', () => {
		const { getByTestId, getByText } = renderComponent({ props: { data: { surface: 'export' } } });

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

	it('navigates to MCP settings and closes when Connect n8n is clicked', async () => {
		const user = userEvent.setup();
		const { getByTestId } = renderComponent({ props: { data: { surface: 'export' } } });

		await user.click(getByTestId('mcp-json-nudge-connect-button'));

		expect(routerPushMock).toHaveBeenCalledWith({ name: MCP_SETTINGS_VIEW });
		expect(closeMock).toHaveBeenCalled();
	});

	it('closes without navigating when Skip is clicked', async () => {
		const user = userEvent.setup();
		const { getByTestId } = renderComponent({ props: { data: { surface: 'export' } } });

		await user.click(getByTestId('mcp-json-nudge-skip-button'));

		expect(routerPushMock).not.toHaveBeenCalled();
		expect(closeMock).toHaveBeenCalled();
	});
});
