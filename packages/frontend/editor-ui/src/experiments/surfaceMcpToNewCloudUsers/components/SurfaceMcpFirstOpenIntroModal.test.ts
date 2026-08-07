import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import {
	SURFACE_MCP_FIRST_OPEN_INTRO_MODAL_KEY,
	SURFACE_MCP_ONBOARDING_MODAL_KEY,
} from '@/experiments/surfaceMcpToNewCloudUsers/constants';
import { useSurfaceMcpToNewCloudUsersStore } from '@/experiments/surfaceMcpToNewCloudUsers/stores/surfaceMcpToNewCloudUsers.store';
import { MCP_SETTINGS_VIEW } from '@/features/ai/mcpAccess/mcp.constants';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { defineComponent } from 'vue';
import SurfaceMcpFirstOpenIntroModal from './SurfaceMcpFirstOpenIntroModal.vue';

const ModalStub = defineComponent({
	props: ['name', 'title', 'eventBus'],
	template: `
		<div :data-test-id="name">
			<h1>{{ title }}</h1>
			<slot name="content" />
			<slot name="footer" />
			<button data-test-id="surface-mcp-intro-generic-close" @click="eventBus.emit('closed')" />
		</div>
	`,
});

const RouterLinkStub = defineComponent({
	props: ['to'],
	template: '<a :data-route-name="to?.name"><slot /></a>',
});

const renderComponent = createComponentRenderer(SurfaceMcpFirstOpenIntroModal, {
	global: {
		stubs: {
			Modal: ModalStub,
			RouterLink: RouterLinkStub,
		},
	},
});

describe('SurfaceMcpFirstOpenIntroModal', () => {
	let pinia: ReturnType<typeof createTestingPinia>;

	beforeEach(() => {
		pinia = createTestingPinia();

		const uiStore = mockedStore(useUIStore);
		const surfaceMcpStore = mockedStore(useSurfaceMcpToNewCloudUsersStore);

		uiStore.openModalWithData = vi.fn();
		uiStore.closeModal = vi.fn();
		surfaceMcpStore.dismissFirstOpenModal = vi.fn();
		surfaceMcpStore.trackDismissed = vi.fn();
	});

	it('renders the intro copy and both actions', () => {
		const { getByText, getByTestId } = renderComponent({ pinia });

		expect(getByText('Try MCP with Claude Code, Cursor, or Codex')).toBeInTheDocument();
		expect(
			getByText(
				'Connect MCP clients like Claude Code and Cursor to build, run, and iterate on workflows in your instance.',
			),
		).toBeInTheDocument();
		const settingsLink = getByTestId('surface-mcp-intro-settings-link');
		expect(settingsLink).toHaveTextContent('Settings > Instance-level MCP');
		expect(settingsLink).toHaveAttribute('data-route-name', MCP_SETTINGS_VIEW);
		expect(getByTestId('surface-mcp-intro-skip-button')).toBeInTheDocument();
		expect(getByTestId('surface-mcp-intro-try-button')).toBeInTheDocument();
	});

	it('closes the intro modal and opens the setup modal when the user clicks Try MCP', async () => {
		const user = userEvent.setup();
		const uiStore = mockedStore(useUIStore);
		const surfaceMcpStore = mockedStore(useSurfaceMcpToNewCloudUsersStore);
		const { getByTestId } = renderComponent({ pinia });

		await user.click(getByTestId('surface-mcp-intro-try-button'));

		expect(uiStore.closeModal).toHaveBeenCalledWith(SURFACE_MCP_FIRST_OPEN_INTRO_MODAL_KEY);
		expect(uiStore.openModalWithData).toHaveBeenCalledWith({
			name: SURFACE_MCP_ONBOARDING_MODAL_KEY,
			data: { surface: 'first_open_modal' },
		});
		expect(surfaceMcpStore.dismissFirstOpenModal).not.toHaveBeenCalled();
		expect(surfaceMcpStore.trackDismissed).not.toHaveBeenCalled();
	});

	it('dismisses the experiment when the user clicks Skip for now', async () => {
		const user = userEvent.setup();
		const uiStore = mockedStore(useUIStore);
		const surfaceMcpStore = mockedStore(useSurfaceMcpToNewCloudUsersStore);
		const { getByTestId } = renderComponent({ pinia });

		await user.click(getByTestId('surface-mcp-intro-skip-button'));

		expect(surfaceMcpStore.dismissFirstOpenModal).toHaveBeenCalled();
		expect(surfaceMcpStore.trackDismissed).toHaveBeenCalledWith('first_open_modal');
		expect(uiStore.closeModal).toHaveBeenCalledWith(SURFACE_MCP_FIRST_OPEN_INTRO_MODAL_KEY);
		expect(uiStore.openModalWithData).not.toHaveBeenCalled();
	});

	it('treats a generic modal close as Skip for now', async () => {
		const user = userEvent.setup();
		const uiStore = mockedStore(useUIStore);
		const surfaceMcpStore = mockedStore(useSurfaceMcpToNewCloudUsersStore);
		const { getByTestId } = renderComponent({ pinia });

		await user.click(getByTestId('surface-mcp-intro-generic-close'));

		expect(surfaceMcpStore.dismissFirstOpenModal).toHaveBeenCalled();
		expect(surfaceMcpStore.trackDismissed).toHaveBeenCalledWith('first_open_modal');
		expect(uiStore.closeModal).not.toHaveBeenCalled();
		expect(uiStore.openModalWithData).not.toHaveBeenCalled();
	});
});
