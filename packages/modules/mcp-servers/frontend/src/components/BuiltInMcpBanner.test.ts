import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { useUsersStore } from '@n8n/stores/users.store';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/vue';

import { BUILT_IN_MCP_BANNER_CALLOUT, MCP_SETTINGS_ROUTE } from '../mcp-servers.constants';
import BuiltInMcpBanner from './BuiltInMcpBanner.vue';

const push = vi.hoisted(() => vi.fn());
vi.mock('vue-router', () => ({
	useRouter: () => ({ push }),
}));

const renderComponent = createComponentRenderer(BuiltInMcpBanner);

describe('BuiltInMcpBanner', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders the built-in n8n MCP message and opens MCP settings on click', async () => {
		renderComponent();

		const banner = screen.getByTestId('builtin-mcp-banner');
		expect(banner).toHaveTextContent(
			'Looking to build and run workflows on this instance from your AI client? That is the built-in n8n MCP.',
		);

		const action = screen.getByTestId('builtin-mcp-banner-action');
		expect(action).toHaveTextContent('Open MCP settings');
		await userEvent.click(action);

		expect(push).toHaveBeenCalledWith({ name: MCP_SETTINGS_ROUTE });
	});

	it('hides the banner permanently for the user when dismissed', async () => {
		renderComponent();
		const usersStore = useUsersStore();
		usersStore.addUsers([
			{
				id: 'user-1',
				isPending: false,
				settings: { dismissedCallouts: { existingCallout: true } },
			},
		]);
		usersStore.currentUserId = 'user-1';
		const updateSettingsSpy = vi
			.spyOn(usersStore, 'updateUserSettings')
			.mockResolvedValue(undefined);

		await userEvent.click(screen.getByTestId('builtin-mcp-banner-dismiss'));

		expect(screen.queryByTestId('builtin-mcp-banner')).not.toBeInTheDocument();
		expect(usersStore.isCalloutDismissed(BUILT_IN_MCP_BANNER_CALLOUT)).toBe(true);
		expect(updateSettingsSpy).toHaveBeenCalledWith({
			dismissedCallouts: {
				existingCallout: true,
				[BUILT_IN_MCP_BANNER_CALLOUT]: true,
			},
		});
	});

	it('stays hidden when the user already dismissed it', () => {
		const usersStore = useUsersStore();
		usersStore.addUsers([
			{
				id: 'user-1',
				isPending: false,
				settings: { dismissedCallouts: { [BUILT_IN_MCP_BANNER_CALLOUT]: true } },
			},
		]);
		usersStore.currentUserId = 'user-1';

		renderComponent();

		expect(screen.queryByTestId('builtin-mcp-banner')).not.toBeInTheDocument();
	});
});
