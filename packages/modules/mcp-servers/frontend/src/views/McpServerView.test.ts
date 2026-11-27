import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';

import { MCP_SERVER_CONNECTIONS_VIEW, MCP_SERVER_VIEW } from '../mcp-servers.constants';
import McpServerView from './McpServerView.vue';

const route = vi.hoisted(() => ({
	name: 'McpServerView',
	params: { projectId: 'project-1', serverId: 'server-1' },
}));
const push = vi.hoisted(() => vi.fn());
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRoute: () => route,
	useRouter: () => ({ push }),
}));

const renderComponent = createComponentRenderer(McpServerView);

describe('McpServerView', () => {
	beforeEach(() => {
		route.name = MCP_SERVER_VIEW;
		push.mockClear();
	});

	it('shows the tabs "Contents" and "Connections", with "Contents" open', () => {
		const { getByTestId, getByText, queryByTestId } = renderComponent();

		expect(getByText('Contents')).toBeInTheDocument();
		expect(getByText('Connections')).toBeInTheDocument();
		expect(getByTestId('mcp-server-contents')).toBeInTheDocument();
		expect(queryByTestId('mcp-server-connections')).not.toBeInTheDocument();
	});

	it('opens the connections on their own route', () => {
		route.name = MCP_SERVER_CONNECTIONS_VIEW;
		const { getByTestId, queryByTestId } = renderComponent();

		expect(getByTestId('mcp-server-connections')).toBeInTheDocument();
		expect(queryByTestId('mcp-server-contents')).not.toBeInTheDocument();
	});

	it('changes the route when a tab is selected', async () => {
		const { getByText } = renderComponent();

		await userEvent.click(getByText('Connections'));

		expect(push).toHaveBeenCalledWith({ name: MCP_SERVER_CONNECTIONS_VIEW, params: route.params });
	});
});
