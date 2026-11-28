import { ModuleRegistry } from '@n8n/backend-common';
import {
	clearMcpServerTables,
	createMcpServer,
	createMcpServerBlock,
	createMcpServerConnection,
	createMcpServerTool,
	findMcpServer,
	findMcpServerBlocks,
	findMcpServerConnections,
	findMcpServerTools,
} from '@n8n/backend-module-mcp-servers/testing';
import { createTeamProject } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { v7 as uuidv7 } from 'uuid';

import { createMember } from '../shared/db/users';
import * as utils from '../shared/utils/';

/** The slices of custom MCP servers test their routes on this setup. */
utils.setupTestServer({ endpointGroups: ['mcp-servers'], modules: ['mcp-servers'] });

beforeEach(async () => {
	await clearMcpServerTables();
});

describe('mcp-servers module', () => {
	it('is active in the test server', () => {
		expect(Container.get(ModuleRegistry).isActive('mcp-servers')).toBe(true);
	});

	it('stores a server and its tools in the module tables', async () => {
		const project = await createTeamProject();
		const serverId = uuidv7();

		await createMcpServer({
			id: serverId,
			projectId: project.id,
			name: 'Sales tools',
			slug: 'sales-tools',
		});
		await createMcpServerTool({
			id: uuidv7(),
			serverId,
			kind: 'workflow',
			targetId: 'workflow-1',
			toolName: 'get_pipeline_summary',
			toolData: { region: 'emea' },
		});

		const server = await findMcpServer(serverId);
		const [tool] = await findMcpServerTools(serverId);
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

		await createMcpServer({
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

		await createMcpServerConnection({
			serverId,
			userId: member.id,
			oauthClientId,
			clientName: 'Claude Code',
		});
		await createMcpServerBlock({ serverId, userId: member.id, blockedById: null });

		const [connection] = await findMcpServerConnections(serverId);
		const [block] = await findMcpServerBlocks(serverId);
		expect(connection.firstUsedAt).toBeInstanceOf(Date);
		expect(connection.lastUsedAt).toBeInstanceOf(Date);
		expect(block.blockedAt).toBeInstanceOf(Date);
	});
});
