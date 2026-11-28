import type { McpServerListTool } from '@n8n/api-types';
import { AGENT_BUILDER_VIEW } from '@n8n/frontend-constants/agents';
import { VIEWS } from '@n8n/frontend-constants/views';

import { MCP_SERVER_VIEW } from '../mcp-servers.constants';
import { useMcpServerItemsMenu } from './useMcpServerItemsMenu';

const push = vi.hoisted(() => vi.fn());
const resolve = vi.hoisted(() => vi.fn(() => ({ href: '/resolved-href' })));
vi.mock('vue-router', () => ({
	useRouter: () => ({ push, resolve }),
}));

const nodeTool: McpServerListTool = {
	id: '0190a8d6-4a2e-7000-8000-000000000011',
	kind: 'node',
	targetId: null,
	toolName: 'search_slack',
};

const workflowTool: McpServerListTool = {
	id: '0190a8d6-4a2e-7000-8000-000000000012',
	kind: 'workflow',
	targetId: 'wf-1',
	toolName: 'get_campaign_numbers',
};

const agentTool: McpServerListTool = {
	id: '0190a8d6-4a2e-7000-8000-000000000013',
	kind: 'agent',
	targetId: 'agent-1',
	toolName: 'support_agent',
};

const skillTool: McpServerListTool = {
	id: '0190a8d6-4a2e-7000-8000-000000000014',
	kind: 'skill',
	targetId: 'skill-1',
	toolName: 'brand_guidelines',
};

const serverRef = {
	id: '0190a8d6-4a2e-7000-8000-000000000001',
	projectId: 'project-1',
};

describe('useMcpServerItemsMenu', () => {
	let windowOpenSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();
		windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
	});

	afterEach(() => {
		windowOpenSpy.mockRestore();
	});

	it('groups items as Tools, Workflows, Agents, and Skills in order', () => {
		const { buildItemMenuItems } = useMcpServerItemsMenu();

		const items = buildItemMenuItems([skillTool, agentTool, workflowTool, nodeTool]);

		expect(
			items.map(({ id, label, icon, disabled, divided }) => ({
				id,
				label,
				icon,
				disabled,
				divided,
			})),
		).toEqual([
			{
				id: 'header-node',
				label: 'Tools',
				icon: { type: 'icon', value: 'wrench' },
				disabled: true,
				divided: false,
			},
			{
				id: `node:${nodeTool.id}`,
				label: 'search_slack',
				icon: undefined,
				disabled: undefined,
				divided: undefined,
			},
			{
				id: 'header-workflow',
				label: 'Workflows',
				icon: { type: 'icon', value: 'workflow' },
				disabled: true,
				divided: true,
			},
			{
				id: `workflow:${workflowTool.id}`,
				label: 'get_campaign_numbers',
				icon: undefined,
				disabled: undefined,
				divided: undefined,
			},
			{
				id: 'header-agent',
				label: 'Agents',
				icon: { type: 'icon', value: 'bot' },
				disabled: true,
				divided: true,
			},
			{
				id: `agent:${agentTool.id}`,
				label: 'support_agent',
				icon: undefined,
				disabled: undefined,
				divided: undefined,
			},
			{
				id: 'header-skill',
				label: 'Skills',
				icon: { type: 'icon', value: 'book-open' },
				disabled: true,
				divided: true,
			},
			{
				id: `skill:${skillTool.id}`,
				label: 'brand_guidelines',
				icon: undefined,
				disabled: undefined,
				divided: undefined,
			},
		]);
	});

	it('omits empty groups and leaves the first shown group undivided', () => {
		const { buildItemMenuItems } = useMcpServerItemsMenu();

		const items = buildItemMenuItems([workflowTool, skillTool]);

		expect(items.map((item) => item.id)).toEqual([
			'header-workflow',
			`workflow:${workflowTool.id}`,
			'header-skill',
			`skill:${skillTool.id}`,
		]);
		expect(items[0].divided).toBe(false);
		expect(items[2].divided).toBe(true);
	});

	it('filters items case-insensitively by tool name', () => {
		const { buildItemMenuItems } = useMcpServerItemsMenu();

		const items = buildItemMenuItems([nodeTool, workflowTool, agentTool, skillTool], 'CAMPAIGN');

		expect(items.map((item) => item.id)).toEqual([
			'header-workflow',
			`workflow:${workflowTool.id}`,
		]);
	});

	it('resolves valid menu ids and ignores malformed or header ids', () => {
		const { resolveItemMenuId } = useMcpServerItemsMenu();

		expect(resolveItemMenuId([nodeTool, workflowTool], `workflow:${workflowTool.id}`)).toEqual(
			workflowTool,
		);
		expect(resolveItemMenuId([nodeTool], 'header-node')).toBeUndefined();
		expect(resolveItemMenuId([nodeTool], 'invalid')).toBeUndefined();
	});

	it('opens a workflow in a new tab', () => {
		const { openServerItem } = useMcpServerItemsMenu();

		openServerItem(serverRef, workflowTool);

		expect(resolve).toHaveBeenCalledWith({
			name: VIEWS.WORKFLOW,
			params: { workflowId: 'wf-1' },
		});
		expect(windowOpenSpy).toHaveBeenCalledWith('/resolved-href', '_blank', 'noopener,noreferrer');
	});

	it('opens an agent in a new tab', () => {
		const { openServerItem } = useMcpServerItemsMenu();

		openServerItem(serverRef, agentTool);

		expect(resolve).toHaveBeenCalledWith({
			name: AGENT_BUILDER_VIEW,
			params: { projectId: 'project-1', agentId: 'agent-1' },
		});
		expect(windowOpenSpy).toHaveBeenCalledWith('/resolved-href', '_blank', 'noopener,noreferrer');
	});

	it('opens the server page with the tool modal query for a node tool', () => {
		const { openServerItem } = useMcpServerItemsMenu();

		openServerItem(serverRef, nodeTool);

		expect(push).toHaveBeenCalledWith({
			name: MCP_SERVER_VIEW,
			params: { projectId: 'project-1', serverId: serverRef.id },
			query: { tool: 'search_slack' },
		});
		expect(windowOpenSpy).not.toHaveBeenCalled();
	});

	it('opens the server page with the skill modal query for a skill', () => {
		const { openServerItem } = useMcpServerItemsMenu();

		openServerItem(serverRef, skillTool);

		expect(push).toHaveBeenCalledWith({
			name: MCP_SERVER_VIEW,
			params: { projectId: 'project-1', serverId: serverRef.id },
			query: { skill: 'brand_guidelines' },
		});
		expect(windowOpenSpy).not.toHaveBeenCalled();
	});
});
