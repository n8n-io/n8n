import { AGENTS_LIST_VIEW, PROJECT_AGENTS } from '@n8n/frontend-constants/agents';
import { VIEWS } from '@n8n/frontend-constants/views';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import type { Scope } from '@n8n/permissions';
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router';

import {
	MCP_SERVER_CONNECTIONS_VIEW,
	MCP_SERVER_SHARE_VIEW,
	MCP_SERVER_VIEW,
	MCP_SERVERS_LIST_VIEW,
	PROJECT_MCP_SERVERS,
} from './mcp-servers.constants';
import { McpServersModule } from './mcp-servers.module';

const stub = { render: () => null };

const route = (name: string) => {
	const found = McpServersModule.routes?.find((candidate) => candidate.name === name);
	if (!found) throw new Error(`No route ${name}`);
	return { ...found, component: stub } as RouteRecordRaw;
};

const overviewTab = McpServersModule.projectTabs?.overview?.[0];
const projectTab = McpServersModule.projectTabs?.project?.[0];

function createTestRouter() {
	return createRouter({
		history: createMemoryHistory(),
		routes: [
			route(MCP_SERVERS_LIST_VIEW),
			{ path: '/home/workflows', name: VIEWS.WORKFLOWS, component: stub },
			{
				path: '/projects/:projectId',
				children: [
					route(PROJECT_MCP_SERVERS),
					route(MCP_SERVER_VIEW),
					route(MCP_SERVER_CONNECTIONS_VIEW),
					{ path: 'workflows', name: VIEWS.PROJECTS_WORKFLOWS, component: stub },
				],
			},
		],
	});
}

function setUp({ flag = true, scopes = [] as Scope[] } = {}) {
	capabilityRegistry.provide(capabilities.customMcpServersEnabled, () => flag);
	capabilityRegistry.provide(capabilities.projectPermissions, {
		scopesFor: () => scopes,
		isReadOnly: () => false,
	});
}

describe('McpServersModule', () => {
	afterEach(() => {
		capabilityRegistry.clear();
	});

	it('has the id of the backend module', () => {
		expect(McpServersModule.id).toBe('mcp-servers');
	});

	describe('tabs', () => {
		it('puts the "MCP" tab after "Agents", with a "Preview" tag', () => {
			expect(overviewTab).toMatchObject({
				label: 'MCP',
				preview: true,
				insertAfter: AGENTS_LIST_VIEW,
				to: { name: MCP_SERVERS_LIST_VIEW },
			});
			expect(projectTab).toMatchObject({
				label: 'MCP',
				preview: true,
				insertAfter: PROJECT_AGENTS,
				dynamicRoute: { name: PROJECT_MCP_SERVERS, includeProjectId: true },
			});
		});

		it('shows the tabs only for the variant test of the flag', () => {
			setUp({ flag: true, scopes: ['mcpServer:list'] });
			expect(overviewTab?.available?.()).toBe(true);
			expect(projectTab?.available?.('project-1')).toBe(true);

			capabilityRegistry.clear();
			setUp({ flag: false, scopes: ['mcpServer:list'] });
			expect(overviewTab?.available?.()).toBe(false);
			expect(projectTab?.available?.('project-1')).toBe(false);
		});

		it('hides the tabs when the shell provides no flag', () => {
			expect(overviewTab?.available?.()).toBe(false);
		});

		it('hides the project tab from a person who cannot list servers', () => {
			setUp({ scopes: ['workflow:list'] });

			expect(projectTab?.available?.('project-1')).toBe(false);
		});
	});

	describe('routes', () => {
		it('opens the share page with no sign-in, in the layout without the sidebar', () => {
			const share = route(MCP_SERVER_SHARE_VIEW);

			expect(share.path).toBe('/mcp-share/:slug');
			expect(share.meta?.middleware).toBeUndefined();
			expect(share.meta?.layout).toBe('auth');
		});

		it('opens the overview list for the variant test of the flag', async () => {
			setUp();
			const router = createTestRouter();

			await router.push('/home/mcp-servers');

			expect(router.currentRoute.value.name).toBe(MCP_SERVERS_LIST_VIEW);
		});

		it('redirects the overview list to the workflows when the flag is off', async () => {
			setUp({ flag: false });
			const router = createTestRouter();

			await router.push('/home/mcp-servers');

			expect(router.currentRoute.value.name).toBe(VIEWS.WORKFLOWS);
		});

		it('opens the project list for a person who can list servers', async () => {
			setUp({ scopes: ['mcpServer:list'] });
			const router = createTestRouter();

			await router.push('/projects/project-1/mcp-servers');

			expect(router.currentRoute.value.name).toBe(PROJECT_MCP_SERVERS);
		});

		it.each([
			['the flag is off', { flag: false, scopes: ['mcpServer:list'] as Scope[] }],
			['the person cannot list servers', { scopes: ['workflow:list'] as Scope[] }],
		])('redirects the project list to the workflows when %s', async (_case, options) => {
			setUp(options);
			const router = createTestRouter();

			await router.push('/projects/project-1/mcp-servers');

			expect(router.currentRoute.value.name).toBe(VIEWS.PROJECTS_WORKFLOWS);
			expect(router.currentRoute.value.params).toEqual({ projectId: 'project-1' });
		});

		it.each([
			['/projects/project-1/mcp-servers/server-1', MCP_SERVER_VIEW],
			['/projects/project-1/mcp-servers/server-1/connections', MCP_SERVER_CONNECTIONS_VIEW],
		])('opens %s for a person who can read servers', async (path, name) => {
			setUp({ scopes: ['mcpServer:read'] });
			const router = createTestRouter();

			await router.push(path);

			expect(router.currentRoute.value.name).toBe(name);
		});

		it('redirects the server page to the workflows when the person cannot read servers', async () => {
			setUp({ scopes: ['mcpServer:list'] });
			const router = createTestRouter();

			await router.push('/projects/project-1/mcp-servers/server-1');

			expect(router.currentRoute.value.name).toBe(VIEWS.PROJECTS_WORKFLOWS);
		});
	});
});
