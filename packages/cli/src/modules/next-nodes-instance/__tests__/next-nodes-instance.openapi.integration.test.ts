import { mockInstance, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { NodeContractVersionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { ContractStore } from '@n8n/node-sdk/registry';
import { mock } from 'vitest-mock-extended';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { ContractNodeLoader, NodeContractsStore } from '@/node-contracts-registry';

import { createChatUser, createOwner } from '../../../../test/integration/shared/db/users';
import { setupTestServer } from '../../../../test/integration/shared/utils';

mockInstance(NodeContractsStore, { open: async () => mock<ContractStore>() });
const loader = Object.assign(Object.create(ContractNodeLoader.prototype), {
	runtime: { credentialManifestOf: async () => undefined },
});
mockInstance(LoadNodesAndCredentials, { loaders: { contracts: loader } });

const testServer = setupTestServer({ endpointGroups: ['next-nodes-instance'] });

const document = `
openapi: 3.0.3
info: { title: Acme API, version: 1.0.0 }
servers: [{ url: 'https://api.acme.test/v1' }]
security: [{ key: [] }]
components:
  securitySchemes:
    key: { type: apiKey, in: header, name: X-Acme-Key }
  schemas:
    Task:
      type: object
      properties: { id: { type: string }, title: { type: string } }
paths:
  /tasks:
    get:
      operationId: listTasks
      summary: List tasks
      responses:
        '200':
          description: ok
          content:
            application/json:
              schema: { type: array, items: { $ref: '#/components/schemas/Task' } }
  /tasks/{id}:
    get:
      operationId: getTask
      summary: Get a task
      parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
      responses:
        '200':
          description: ok
          content: { application/json: { schema: { $ref: '#/components/schemas/Task' } } }
  /import:
    post:
      summary: Import tasks
      requestBody: { content: { text/csv: { schema: { type: string } } } }
      responses: { '204': { description: ok } }
`;

const users: Record<'owner' | 'chatUser', User> = {} as never;

beforeAll(async () => {
	Object.assign(users, { owner: await createOwner(), chatUser: await createChatUser() });
});

beforeEach(async () => {
	await testDb.truncate(['NodeContractVersion']);
});

describe('POST /next-nodes/instance/openapi', () => {
	it('publishes each mappable operation and lists the skipped ones', async () => {
		const response = await testServer
			.authAgentFor(users.owner)
			.post('/next-nodes/instance/openapi')
			.send({ document });

		expect(response.status).toBe(200);
		expect(response.body.data).toEqual({
			node: { id: 'acme', displayName: 'Acme' },
			published: [
				{ actionId: 'acme.listTasks', semver: '1.0.0', action: 'List tasks' },
				{ actionId: 'acme.getTask', semver: '1.0.0', action: 'Get a task' },
			],
			skipped: [{ operation: 'POST /import', reason: 'the body is text/csv, not JSON' }],
			credential: { type: 'httpHeaderAuth', header: 'X-Acme-Key' },
		});
		const rows = await Container.get(NodeContractVersionRepository).find();
		expect(rows.map(({ contractId }) => contractId).sort()).toEqual([
			'acme.getTask',
			'acme.listTasks',
		]);
		expect(JSON.parse(rows[0].manifest).contract.credentials).toEqual(['httpHeaderAuth']);
	});

	it('skips the operations that are already published', async () => {
		const agent = testServer.authAgentFor(users.owner);
		await agent.post('/next-nodes/instance/openapi').send({ document });

		const response = await agent.post('/next-nodes/instance/openapi').send({ document });

		expect(response.status).toBe(200);
		expect(response.body.data.published).toEqual([]);
		expect(response.body.data.skipped).toEqual([
			{ operation: 'POST /import', reason: 'the body is text/csv, not JSON' },
			{ operation: 'GET /tasks', reason: 'acme.listTasks@1.0.0 already has this config' },
			{ operation: 'GET /tasks/{id}', reason: 'acme.getTask@1.0.0 already has this config' },
		]);
	});

	it('refuses a document that is not OpenAPI 3', async () => {
		const response = await testServer
			.authAgentFor(users.owner)
			.post('/next-nodes/instance/openapi')
			.send({ document: 'swagger: "2.0"' });

		expect(response.status).toBe(400);
		expect(response.body.message).toContain('Swagger 2.0 is not supported');
	});

	it('refuses a chat user', async () => {
		const response = await testServer
			.authAgentFor(users.chatUser)
			.post('/next-nodes/instance/openapi')
			.send({ document });

		expect(response.status).toBe(403);
	});
});
