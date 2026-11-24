import { createTeamProject, testDb } from '@n8n/backend-test-utils';
import { ModuleRegistry } from '@n8n/backend-common';
import { McpServer, McpServerTool } from '@n8n/backend-module-mcp-servers';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { v7 as uuidv7 } from 'uuid';

import * as utils from '../shared/utils/';

/** The slices of custom MCP servers test their routes on this setup. */
utils.setupTestServer({ endpointGroups: ['mcp-servers'], modules: ['mcp-servers'] });

beforeEach(async () => {
	await testDb.truncate(['McpServerTool', 'McpServer']);
});

describe('mcp-servers module', () => {
	it('is active in the test server', () => {
		expect(Container.get(ModuleRegistry).isActive('mcp-servers')).toBe(true);
	});

	it('stores a server and its tools in the module tables', async () => {
		const project = await createTeamProject();
		const dataSource = Container.get(DataSource);
		const serverId = uuidv7();

		await dataSource.getRepository(McpServer).insert({
			id: serverId,
			projectId: project.id,
			name: 'Sales tools',
			slug: 'sales-tools',
		});
		await dataSource.getRepository(McpServerTool).insert({
			id: uuidv7(),
			serverId,
			kind: 'workflow',
			targetId: 'workflow-1',
			toolName: 'get_pipeline_summary',
			toolData: { region: 'emea' },
		});

		const server = await dataSource.getRepository(McpServer).findOneByOrFail({ id: serverId });
		const [tool] = await dataSource.getRepository(McpServerTool).findBy({ serverId });
		expect(server).toMatchObject({ slug: 'sales-tools', description: '', deletedAt: null });
		expect(tool).toMatchObject({
			draftSource: 'defaults',
			position: 0,
			toolData: { region: 'emea' },
		});
	});
});
