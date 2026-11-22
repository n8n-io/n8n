import type { CreateCustomNodeDto, CustomActionDraft } from '@n8n/api-types';
import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import request from 'supertest';

import { AuthService } from '@/auth/auth.service';
import { AUTH_COOKIE_NAME } from '@/constants';
import { createMember, createOwner } from '@test-integration/db/users';
import { REST_PATH_SEGMENT } from '@test-integration/constants';
import type { SuperAgentTest } from '@test-integration/types';
import { setupTestServer } from '@test-integration/utils';

import { CustomNodeConflictError } from '../custom-nodes.errors';
import { CustomNodesRegistry } from '../custom-nodes.registry';
import { CustomNodesService } from '../custom-nodes.service';
import { CustomActionEntity } from '../database/entities/custom-action.entity';
import { CustomNodeEntity } from '../database/entities/custom-node.entity';
import { listenOnLoopback } from './loopback-server';

const registry = mockInstance(CustomNodesRegistry);

const testServer = setupTestServer({
	endpointGroups: ['me'],
	modules: ['custom-nodes'],
	reuseServer: true,
});

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const pngUri = `data:image/png;base64,${PNG.toString('base64')}`;
const svgUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
const PLAIN_SVG =
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>';

const getInvoice = (): CustomActionDraft => ({
	name: 'Get Invoice',
	description: 'Reads one invoice',
	inputs: [
		{
			name: 'invoiceId',
			displayName: 'Invoice ID',
			type: 'string',
			required: true,
			target: 'url',
			key: 'invoiceId',
		},
	],
	request: {
		method: 'GET',
		url: '/invoices/{invoiceId}',
		headers: {},
		query: {},
		bodyType: 'none',
		body: {},
	},
});

const listInvoices = (): CustomActionDraft => ({
	name: 'List Invoices',
	inputs: [],
	request: { method: 'GET', url: '/invoices', headers: {}, query: {}, bodyType: 'none', body: {} },
});

const newNode = (actions = [getInvoice()]): CreateCustomNodeDto => ({
	displayName: 'Acme Billing',
	baseUrl: 'https://billing.acme.test/api',
	auth: { kind: 'generic', type: 'httpHeaderAuth' },
	actions,
});

let owner: User;
let member: User;
let ownerAgent: SuperAgentTest;
let memberAgent: SuperAgentTest;

/** Creates a node with one action through the API and returns the ids. */
const createNode = async (actions = [getInvoice()]) => {
	const res = await ownerAgent.post('/custom-nodes/nodes').send(newNode(actions)).expect(200);
	const node = res.body.data as { id: string; actions: Array<{ id: string }> };
	return { nodeId: node.id, actionId: node.actions[0].id };
};

/** A session for `user` that is bound to another browser id than the one the request sends. */
const requestFromOtherBrowser = (user: User, method: 'get', path: string) => {
	const token = Container.get(AuthService).issueJWT(
		user as Parameters<AuthService['issueJWT']>[0],
		false,
		'another-browser-id',
	);
	return request(testServer.httpServer)
		[method](`/${REST_PATH_SEGMENT}${path}`)
		.set('Cookie', `${AUTH_COOKIE_NAME}=${token}`);
};

beforeAll(async () => {
	await listenOnLoopback(testServer.httpServer);
	owner = await createOwner();
	member = await createMember();
	ownerAgent = testServer.authAgentFor(owner);
	memberAgent = testServer.authAgentFor(member);
});

beforeEach(() => {
	registry.refresh.mockReset();
	registry.refresh.mockResolvedValue(undefined);
});

afterEach(async () => {
	vi.restoreAllMocks();
	const dataSource = Container.get(DataSource);
	await dataSource.createQueryBuilder().delete().from(CustomActionEntity).execute();
	await dataSource.createQueryBuilder().delete().from(CustomNodeEntity).execute();
});

describe('CustomNodesController', () => {
	it('gates every route with the global customNode scope of the route table', async () => {
		const { CustomNodesController } = await import('../custom-nodes.controller.js');
		const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
			CustomNodesController as never,
		);
		const scopes = Object.fromEntries(
			[...metadata.routes.values()].map((route) => {
				expect(route.skipAuth).toBeFalsy();
				expect(route.accessScope?.globalOnly).toBe(true);
				return [`${route.method.toUpperCase()} ${route.path}`, route.accessScope?.scope];
			}),
		);

		expect(metadata.basePath).toBe('/custom-nodes');
		expect(scopes).toEqual({
			'GET /': 'customNode:list',
			'POST /preview': 'customNode:list',
			'POST /nodes': 'customNode:create',
			'PATCH /nodes/:id': 'customNode:update',
			'DELETE /nodes/:id': 'customNode:delete',
			'PUT /nodes/:id/icon': 'customNode:update',
			'GET /nodes/:id/icon': 'customNode:list',
			'POST /nodes/:id/actions': 'customNode:update',
			'PATCH /actions/:id': 'customNode:update',
			'POST /actions/:id/versions/:version/rollback': 'customNode:update',
			'DELETE /actions/:id': 'customNode:delete',
		});
	});

	describe('scopes', () => {
		type Ids = { nodeId: string; actionId: string };
		const writeRoutes: Array<
			[string, 'post' | 'patch' | 'put' | 'delete', (ids: Ids) => string, object | undefined]
		> = [
			['POST /nodes', 'post', () => '/custom-nodes/nodes', newNode()],
			[
				'PATCH /nodes/:id',
				'patch',
				(ids) => `/custom-nodes/nodes/${ids.nodeId}`,
				{ displayName: 'X' },
			],
			['DELETE /nodes/:id', 'delete', (ids) => `/custom-nodes/nodes/${ids.nodeId}`, undefined],
			[
				'PUT /nodes/:id/icon',
				'put',
				(ids) => `/custom-nodes/nodes/${ids.nodeId}/icon`,
				{ iconDataUri: pngUri },
			],
			[
				'POST /nodes/:id/actions',
				'post',
				(ids) => `/custom-nodes/nodes/${ids.nodeId}/actions`,
				{ draft: listInvoices() },
			],
			[
				'PATCH /actions/:id',
				'patch',
				(ids) => `/custom-nodes/actions/${ids.actionId}`,
				{ draft: listInvoices() },
			],
			[
				'POST /actions/:id/versions/:version/rollback',
				'post',
				(ids) => `/custom-nodes/actions/${ids.actionId}/versions/1/rollback`,
				{ revision: 1 },
			],
			[
				'DELETE /actions/:id',
				'delete',
				(ids) => `/custom-nodes/actions/${ids.actionId}`,
				undefined,
			],
		];

		it.each(writeRoutes)('%s returns 403 for a member', async (_label, method, path, body) => {
			const ids = await createNode([getInvoice(), listInvoices()]);
			registry.refresh.mockClear();

			const req = memberAgent[method](path(ids));
			const res = body === undefined ? await req : await req.send(body);

			expect(res.status).toBe(403);
			// The request changed nothing.
			expect(registry.refresh).not.toHaveBeenCalled();
			const list = await ownerAgent.get('/custom-nodes').expect(200);
			expect(list.body.data).toHaveLength(1);
			expect(list.body.data[0]).toMatchObject({ displayName: 'Acme Billing', hasIcon: false });
			expect(list.body.data[0].actions).toHaveLength(2);
		});

		it('GET / returns 200 for a member', async () => {
			await createNode();

			const res = await memberAgent.get('/custom-nodes').expect(200);

			expect(res.body.data).toHaveLength(1);
			expect(res.body.data[0].displayName).toBe('Acme Billing');
		});

		it('POST /preview returns 200 for a member', async () => {
			const res = await memberAgent
				.post('/custom-nodes/preview')
				.send({ draft: getInvoice() })
				.expect(200);

			expect(res.body.data.issues).toEqual([]);
			expect(res.body.data.properties.map((p: { name: string }) => p.name)).toContain('invoiceId');
		});

		it('returns 401 without a session', async () => {
			await testServer.authlessAgent.get('/custom-nodes').expect(401);
		});
	});

	describe('routes', () => {
		it('creates, updates and deletes a node', async () => {
			const { nodeId } = await createNode();

			const updated = await ownerAgent
				.patch(`/custom-nodes/nodes/${nodeId}`)
				.send({ displayName: 'Acme Payments' })
				.expect(200);
			expect(updated.body.data.displayName).toBe('Acme Payments');

			await ownerAgent.delete(`/custom-nodes/nodes/${nodeId}`).expect(200);
			const list = await ownerAgent.get('/custom-nodes').expect(200);
			expect(list.body.data).toEqual([]);
		});

		it('adds, saves, rolls back and deletes an action', async () => {
			const { nodeId, actionId } = await createNode();

			const added = await ownerAgent
				.post(`/custom-nodes/nodes/${nodeId}/actions`)
				.send({ draft: listInvoices() })
				.expect(200);
			expect(added.body.data.name).toBe('List Invoices');

			const saved = await ownerAgent
				.patch(`/custom-nodes/actions/${actionId}`)
				.send({
					draft: { ...getInvoice(), request: { ...getInvoice().request, method: 'POST' } },
					changeNote: 'Use POST',
				})
				.expect(200);
			expect(saved.body.data.kind).toBe('revision');
			expect(saved.body.data.action.versions[0]).toMatchObject({
				currentRevision: 2,
				revisionCount: 2,
			});

			const rolledBack = await ownerAgent
				.post(`/custom-nodes/actions/${actionId}/versions/1/rollback`)
				.send({ revision: 1 })
				.expect(200);
			expect(rolledBack.body.data.versions[0].currentRevision).toBe(1);

			await ownerAgent.delete(`/custom-nodes/actions/${added.body.data.id}`).expect(200);
			const list = await ownerAgent.get('/custom-nodes').expect(200);
			expect(list.body.data[0].actions).toHaveLength(1);
		});

		it('returns 400 for a version that is not a positive integer', async () => {
			const { actionId } = await createNode();

			await ownerAgent
				.post(`/custom-nodes/actions/${actionId}/versions/abc/rollback`)
				.send({ revision: 1 })
				.expect(400);
		});

		it('returns 400 for a body that does not match the DTO', async () => {
			await ownerAgent.post('/custom-nodes/nodes').send({ displayName: '' }).expect(400);
		});
	});

	describe('errors', () => {
		it('POST /nodes returns 400 with issues for a draft with an expression', async () => {
			const draft = getInvoice();
			draft.request.headers = { 'X-Secret': '{{ $env.SECRET }}' };

			const res = await ownerAgent
				.post('/custom-nodes/nodes')
				.send(newNode([draft]))
				.expect(400);

			expect(res.body.issues[0].code).toBe('expression_not_allowed');
			expect(res.body.issues[0].path).toBe('actions[0].request.headers.X-Secret');
			expect(res.body.message).toBe('The custom action is not valid');
		});

		it('PATCH /actions/:id returns 400 with issues for a draft with an expression', async () => {
			const { actionId } = await createNode();
			const draft = getInvoice();
			draft.request.url = '=/invoices';

			const res = await ownerAgent
				.patch(`/custom-nodes/actions/${actionId}`)
				.send({ draft })
				.expect(400);

			expect(res.body.issues[0].code).toBe('expression_not_allowed');
		});

		it('returns 404 for a node that does not exist', async () => {
			await ownerAgent
				.patch('/custom-nodes/nodes/cn_missing')
				.send({ displayName: 'X' })
				.expect(404);
			await ownerAgent.delete('/custom-nodes/actions/act_missing').expect(404);
		});

		it('returns 400 when the last action of a node is deleted', async () => {
			const { actionId } = await createNode();

			const res = await ownerAgent.delete(`/custom-nodes/actions/${actionId}`).expect(400);

			expect(res.body.message).toContain('at least one action');
		});

		it('returns 400 for a base URL that is not allowed', async () => {
			await ownerAgent
				.post('/custom-nodes/nodes')
				.send({ ...newNode(), baseUrl: 'ftp://billing.acme.test' })
				.expect(400);
		});

		it('returns 409 when another save of the same action ran at the same time', async () => {
			const { actionId } = await createNode();
			vi.spyOn(Container.get(CustomNodesService), 'saveAction').mockRejectedValueOnce(
				new CustomNodeConflictError(),
			);

			const res = await ownerAgent
				.patch(`/custom-nodes/actions/${actionId}`)
				.send({ draft: getInvoice() })
				.expect(409);

			expect(res.body.message).toContain('Reload and try again');
		});
	});

	describe('icon', () => {
		it('serves an icon with nosniff and a sandbox CSP, without a browser-id header', async () => {
			const { nodeId } = await createNode();
			await ownerAgent
				.put(`/custom-nodes/nodes/${nodeId}/icon`)
				.send({ iconDataUri: pngUri })
				.expect(200);

			// The same session fails on a route that is not on the skip list.
			await requestFromOtherBrowser(member, 'get', '/custom-nodes').expect(401);

			const res = await requestFromOtherBrowser(
				member,
				'get',
				`/custom-nodes/nodes/${nodeId}/icon`,
			).expect(200);

			expect(res.headers['content-type']).toBe('image/png');
			expect(res.headers['x-content-type-options']).toBe('nosniff');
			expect(res.headers['content-security-policy']).toBe(
				"default-src 'none'; style-src 'unsafe-inline'; sandbox",
			);
			expect(res.headers['cache-control']).toBe('private, no-cache');
			expect(Buffer.compare(res.body as Buffer, PNG)).toBe(0);
		});

		it('serves an SVG icon as stored with the SVG content type', async () => {
			const { nodeId } = await createNode();
			await ownerAgent
				.put(`/custom-nodes/nodes/${nodeId}/icon`)
				.send({ iconDataUri: svgUri(PLAIN_SVG) })
				.expect(200);

			const res = await memberAgent
				.get(`/custom-nodes/nodes/${nodeId}/icon`)
				.buffer(true)
				.parse((response, callback) => {
					const chunks: Buffer[] = [];
					response.on('data', (chunk: Buffer) => chunks.push(chunk));
					response.on('end', () => callback(null, Buffer.concat(chunks)));
				})
				.expect(200);

			expect(res.headers['content-type']).toBe('image/svg+xml');
			expect((res.body as Buffer).toString('utf8')).toBe(PLAIN_SVG);
		});

		it('GET /nodes/:id/icon requires a session', async () => {
			const { nodeId } = await createNode();
			await ownerAgent
				.put(`/custom-nodes/nodes/${nodeId}/icon`)
				.send({ iconDataUri: pngUri })
				.expect(200);

			await testServer.authlessAgent.get(`/custom-nodes/nodes/${nodeId}/icon`).expect(401);
		});

		it('GET /nodes/:id/icon returns 404 for a node without an icon', async () => {
			const { nodeId } = await createNode();

			await memberAgent.get(`/custom-nodes/nodes/${nodeId}/icon`).expect(404);
		});

		it.each([
			'<svg><script>alert(1)</script></svg>',
			'<svg onload="x()"></svg>',
			'<svg><a href="javascript:x()"/></svg>',
		])('PUT /nodes/:id/icon rejects %s with 400', async (svg) => {
			const { nodeId } = await createNode();

			await ownerAgent
				.put(`/custom-nodes/nodes/${nodeId}/icon`)
				.send({ iconDataUri: svgUri(svg) })
				.expect(400);

			const list = await ownerAgent.get('/custom-nodes').expect(200);
			expect(list.body.data[0].hasIcon).toBe(false);
		});

		it('PUT /nodes/:id/icon rejects a value that is not an image data URI with 400', async () => {
			const { nodeId } = await createNode();

			await ownerAgent
				.put(`/custom-nodes/nodes/${nodeId}/icon`)
				.send({ iconDataUri: 'data:text/html;base64,PGgxPg==' })
				.expect(400);
		});
	});
});
