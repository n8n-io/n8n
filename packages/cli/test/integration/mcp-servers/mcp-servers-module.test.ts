import { createTeamProject, testDb } from '@n8n/backend-test-utils';
import { ModuleRegistry } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import {
	McpServer,
	McpServerBlock,
	McpServerConnection,
	McpServerTool,
} from '@n8n/backend-module-mcp-servers';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { v7 as uuidv7 } from 'uuid';

import { createMember } from '../shared/db/users';
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

	it('fills the connection and block dates when an insert leaves them out', async () => {
		const project = await createTeamProject();
		const member = await createMember();
		const dataSource = Container.get(DataSource);
		const serverId = uuidv7();
		const oauthClientId = uuidv7();

		await dataSource.getRepository(McpServer).insert({
			id: serverId,
			projectId: project.id,
			name: 'Sales tools',
			slug: 'sales-tools',
		});
		// The OAuth client entity belongs to the oauth-server module, which this setup does not load.
		const { tablePrefix } = Container.get(GlobalConfig).database;
		await dataSource
			.createQueryBuilder()
			.insert()
			.into(`${tablePrefix}oauth_clients`)
			.values({ id: oauthClientId, name: 'Claude Code', redirectUris: '[]', grantTypes: '[]' })
			.execute();

		await dataSource.getRepository(McpServerConnection).insert({
			serverId,
			userId: member.id,
			oauthClientId,
			clientName: 'Claude Code',
		});
		await dataSource
			.getRepository(McpServerBlock)
			.insert({ serverId, userId: member.id, blockedById: null });

		const connection = await dataSource
			.getRepository(McpServerConnection)
			.findOneByOrFail({ serverId });
		const block = await dataSource.getRepository(McpServerBlock).findOneByOrFail({ serverId });
		expect(connection.firstUsedAt).toBeInstanceOf(Date);
		expect(connection.lastUsedAt).toBeInstanceOf(Date);
		expect(block.blockedAt).toBeInstanceOf(Date);
	});
});
