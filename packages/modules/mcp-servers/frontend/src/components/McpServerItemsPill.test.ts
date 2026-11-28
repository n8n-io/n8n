import type { McpServerListTool } from '@n8n/api-types';
import { VIEWS } from '@n8n/frontend-constants/views';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/vue';

import { MCP_SERVER_VIEW } from '../mcp-servers.constants';
import McpServerItemsPill from './McpServerItemsPill.vue';

const push = vi.hoisted(() => vi.fn());
const resolve = vi.hoisted(() => vi.fn(() => ({ href: '/workflow/wf-1' })));
vi.mock('vue-router', () => ({
	useRouter: () => ({ push, resolve }),
}));

const renderComponent = createComponentRenderer(McpServerItemsPill);

function makeTool(index: number, overrides: Partial<McpServerListTool> = {}): McpServerListTool {
	return {
		id: `0190a8d6-4a2e-7000-8000-00000000000${index}`,
		kind: 'workflow',
		targetId: `wf-${index}`,
		toolName: `tool_${index}`,
		...overrides,
	};
}

describe('McpServerItemsPill', () => {
	let windowOpenSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();
		windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
	});

	afterEach(() => {
		windowOpenSpy.mockRestore();
	});

	it('renders the graph-12 icon and count, and opens the grouped dropdown on click', async () => {
		const tools = [
			makeTool(1, { kind: 'node', targetId: null, toolName: 'search_slack' }),
			makeTool(2, { kind: 'workflow', targetId: 'wf-1', toolName: 'get_campaign_numbers' }),
			makeTool(3, { kind: 'agent', targetId: 'agent-1', toolName: 'support_agent' }),
			makeTool(4, { kind: 'skill', targetId: 'skill-1', toolName: 'brand_guidelines' }),
		];

		const { container } = renderComponent({
			props: {
				server: {
					id: '0190a8d6-4a2e-7000-8000-000000000001',
					projectId: 'project-1',
					tools,
				},
				dataTestId: 'items-pill',
			},
		});

		const trigger = screen.getByTestId('items-pill');
		expect(trigger).toHaveTextContent('4');
		expect(container.querySelector('[data-icon="graph-12"]')).not.toBeNull();

		await userEvent.click(trigger);

		expect(await screen.findByText('Tools')).toBeInTheDocument();
		expect(screen.getByText('search_slack')).toBeInTheDocument();
		expect(screen.getByText('Workflows')).toBeInTheDocument();
		expect(screen.getByText('get_campaign_numbers')).toBeInTheDocument();
		expect(screen.getByText('Agents')).toBeInTheDocument();
		expect(screen.getByText('support_agent')).toBeInTheDocument();
		expect(screen.getByText('Skills')).toBeInTheDocument();
		expect(screen.getByText('brand_guidelines')).toBeInTheDocument();
		expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
	});

	it('shows search and filters items when the server has 6 or more items', async () => {
		const tools = [
			makeTool(1, { toolName: 'alpha_tool' }),
			makeTool(2, { toolName: 'beta_tool' }),
			makeTool(3, { toolName: 'gamma_tool' }),
			makeTool(4, { toolName: 'delta_tool' }),
			makeTool(5, { toolName: 'epsilon_tool' }),
			makeTool(6, { toolName: 'zeta_tool' }),
		];

		renderComponent({
			props: {
				server: {
					id: '0190a8d6-4a2e-7000-8000-000000000001',
					projectId: 'project-1',
					tools,
				},
				dataTestId: 'items-pill',
			},
		});

		await userEvent.click(screen.getByTestId('items-pill'));
		const searchInput = await screen.findByPlaceholderText('Search...');
		await userEvent.type(searchInput, 'zeta');

		expect(screen.getByText('zeta_tool')).toBeInTheDocument();
		expect(screen.queryByText('alpha_tool')).not.toBeInTheDocument();
	});

	it('opens workflows in a new tab and node tools on the server page', async () => {
		const wf = makeTool(1, { kind: 'workflow', targetId: 'wf-1', toolName: 'get_numbers' });
		const node = makeTool(2, { kind: 'node', targetId: null, toolName: 'search_slack' });

		renderComponent({
			props: {
				server: {
					id: '0190a8d6-4a2e-7000-8000-000000000001',
					projectId: 'project-1',
					tools: [wf, node],
				},
				dataTestId: 'items-pill',
			},
		});

		await userEvent.click(screen.getByTestId('items-pill'));
		await userEvent.click(await screen.findByText('get_numbers'));
		expect(resolve).toHaveBeenCalledWith({ name: VIEWS.WORKFLOW, params: { workflowId: 'wf-1' } });
		expect(windowOpenSpy).toHaveBeenCalledWith('/workflow/wf-1', '_blank', 'noopener,noreferrer');

		await userEvent.click(screen.getByTestId('items-pill'));
		await userEvent.click(await screen.findByText('search_slack'));
		expect(push).toHaveBeenCalledWith({
			name: MCP_SERVER_VIEW,
			params: { projectId: 'project-1', serverId: '0190a8d6-4a2e-7000-8000-000000000001' },
			query: { tool: 'search_slack' },
		});
	});
});
