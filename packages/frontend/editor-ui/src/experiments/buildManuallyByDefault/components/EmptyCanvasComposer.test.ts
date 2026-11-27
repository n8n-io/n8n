import { reactive } from 'vue';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { MCP_SETTINGS_VIEW } from '@n8n/frontend-module-mcp';

import { createComponentRenderer } from '@/__tests__/render';

import EmptyCanvasComposer from './EmptyCanvasComposer.vue';

const mocks = vi.hoisted(() => ({
	push: vi.fn(),
	startThread: vi.fn(),
	ensurePersonalProjectId: vi.fn(),
	openConnectPopover: vi.fn(),
	trackComposerShown: vi.fn(),
	trackComposerPromptSent: vi.fn(),
	minimizeComposer: vi.fn(),
	trackConnectOptionClicked: vi.fn(),
	refreshConnectedMcpClients: vi.fn(),
}));

const store = reactive({
	showConnectRow: true,
	trackComposerShown: mocks.trackComposerShown,
	trackComposerPromptSent: mocks.trackComposerPromptSent,
	minimizeComposer: mocks.minimizeComposer,
	trackConnectOptionClicked: mocks.trackConnectOptionClicked,
	refreshConnectedMcpClients: mocks.refreshConnectedMcpClients,
});

vi.mock('../stores/buildManuallyByDefault.store', () => ({
	useBuildManuallyByDefaultStore: () => store,
}));

vi.mock('@/features/ai/instanceAi/composables/useInstanceAiHandoff', () => ({
	ensurePersonalProjectId: mocks.ensurePersonalProjectId,
	useInstanceAiHandoff: () => ({ startThread: mocks.startThread }),
}));

vi.mock('@n8n/frontend-module-mcp', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/frontend-module-mcp')>()),
	useMCPStore: () => ({ openConnectPopover: mocks.openConnectPopover }),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({ push: mocks.push }),
}));

const render = createComponentRenderer(EmptyCanvasComposer);

describe('EmptyCanvasComposer', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		store.showConnectRow = true;
		mocks.ensurePersonalProjectId.mockResolvedValue('project-1');
		mocks.startThread.mockResolvedValue('started');
	});

	it('shows the composer and tracks it on an empty canvas', () => {
		const { getByTestId } = render({ props: { isCanvasEmpty: true } });

		expect(getByTestId('empty-canvas-composer')).toBeInTheDocument();
		expect(mocks.trackComposerShown).toHaveBeenCalledTimes(1);
		expect(mocks.refreshConnectedMcpClients).toHaveBeenCalledTimes(1);
	});

	it('renders nothing when the canvas has nodes', () => {
		const { queryByTestId } = render({ props: { isCanvasEmpty: false } });

		expect(queryByTestId('empty-canvas-composer')).not.toBeInTheDocument();
		expect(mocks.trackComposerShown).not.toHaveBeenCalled();
	});

	it('minimizes when the first node is added and comes back when all nodes are removed', async () => {
		const { rerender } = render({ props: { isCanvasEmpty: true } });

		await rerender({ isCanvasEmpty: false });
		expect(mocks.minimizeComposer).toHaveBeenCalledTimes(1);

		await rerender({ isCanvasEmpty: true });
		expect(mocks.trackComposerShown).toHaveBeenCalledTimes(2);
	});

	it('sends the prompt to a new Assistant thread', async () => {
		const { getByTestId } = render({ props: { isCanvasEmpty: true } });

		await userEvent.type(getByTestId('empty-canvas-composer-input'), 'Send me a daily summary');
		await userEvent.click(getByTestId('empty-canvas-composer-send'));

		await waitFor(() =>
			expect(mocks.startThread).toHaveBeenCalledWith(
				'project-1',
				'Send me a daily summary',
				{ kind: 'user_typed' },
				{ source: 'empty_canvas_composer', origin: 'internal' },
			),
		);
		expect(mocks.trackComposerPromptSent).toHaveBeenCalledWith('Send me a daily summary');
	});

	it('collapses the connect row while the user types', async () => {
		const { getByTestId } = render({ props: { isCanvasEmpty: true } });
		const row = getByTestId('empty-canvas-composer-connect-row');
		expect(row).toHaveAttribute('aria-hidden', 'false');

		await userEvent.type(getByTestId('empty-canvas-composer-input'), 'Hi');

		expect(row).toHaveAttribute('aria-hidden', 'true');
	});

	it('sends with Enter and adds a line with Shift+Enter', async () => {
		const { getByTestId } = render({ props: { isCanvasEmpty: true } });
		const input = getByTestId('empty-canvas-composer-input');

		await userEvent.type(input, 'Line one{Shift>}{Enter}{/Shift}');
		expect(mocks.startThread).not.toHaveBeenCalled();

		await userEvent.type(input, '{Enter}');
		await waitFor(() => expect(mocks.startThread).toHaveBeenCalledTimes(1));
		expect(mocks.startThread.mock.calls[0][1]).toBe('Line one');
	});

	it('shows the Claude and MCP icons in the connect options', () => {
		const { getByTestId } = render({ props: { isCanvasEmpty: true } });

		expect(getByTestId('empty-canvas-composer-connect-claude').querySelector('svg')).not.toBeNull();
		expect(getByTestId('empty-canvas-composer-connect-other').querySelector('svg')).not.toBeNull();
	});

	it('hides the connect row when a client is connected', () => {
		store.showConnectRow = false;
		const { queryByTestId } = render({ props: { isCanvasEmpty: true } });

		expect(queryByTestId('empty-canvas-composer-connect-row')).not.toBeInTheDocument();
	});

	it('opens the connect dialog on the MCP settings page for Claude', async () => {
		const { getByTestId } = render({ props: { isCanvasEmpty: true } });

		await userEvent.click(getByTestId('empty-canvas-composer-connect-claude'));

		expect(mocks.trackConnectOptionClicked).toHaveBeenCalledWith('claude');
		expect(mocks.push).toHaveBeenCalledWith({ name: MCP_SETTINGS_VIEW });
		expect(mocks.openConnectPopover).toHaveBeenCalledTimes(1);
	});

	it('opens the MCP settings page for other assistants', async () => {
		const { getByTestId } = render({ props: { isCanvasEmpty: true } });

		await userEvent.click(getByTestId('empty-canvas-composer-connect-other'));

		expect(mocks.trackConnectOptionClicked).toHaveBeenCalledWith('other_assistants');
		expect(mocks.push).toHaveBeenCalledWith({ name: MCP_SETTINGS_VIEW });
		expect(mocks.openConnectPopover).not.toHaveBeenCalled();
	});
});
