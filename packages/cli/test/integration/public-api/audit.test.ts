import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { randomUUID } from 'node:crypto';

import { createOwnerWithApiKey } from '../shared/db/users';
import * as utils from '../shared/utils';

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });

let scopedOwner: User;
let unscopedOwner: User;

beforeAll(async () => {
	scopedOwner = await createOwnerWithApiKey({ scopes: ['securityAudit:generate'] });
	unscopedOwner = await createOwnerWithApiKey({ scopes: ['workflow:list'] });
});

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity']);
});

describe('POST /audit', () => {
	test('returns the requested security audit reports', async () => {
		await createWorkflow({
			nodes: [
				{
					id: randomUUID(),
					name: 'Read file',
					type: 'n8n-nodes-base.readBinaryFile',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
		});

		const response = await testServer
			.publicApiAgentFor(scopedOwner)
			.post('/audit')
			.send({ additionalOptions: { categories: ['filesystem'] } })
			.expect(200);

		expect(response.body).toEqual({
			'Filesystem Risk Report': {
				risk: 'filesystem',
				sections: [
					expect.objectContaining({
						title: 'Nodes that interact with the filesystem',
						location: [
							expect.objectContaining({
								kind: 'node',
								nodeName: 'Read file',
								nodeType: 'n8n-nodes-base.readBinaryFile',
							}),
						],
					}),
				],
			},
		});
	});

	test('returns an empty array when the audit finds no risks', async () => {
		const response = await testServer
			.publicApiAgentFor(scopedOwner)
			.post('/audit')
			.send({ additionalOptions: { categories: ['filesystem'] } })
			.expect(200);

		expect(response.body).toEqual([]);
	});

	test('rejects an unknown request field', async () => {
		const response = await testServer
			.publicApiAgentFor(scopedOwner)
			.post('/audit')
			.send({ unknown: true })
			.expect(400);

		expect(response.body).toEqual({
			message: "request/body Unrecognized key(s) in object: 'unknown'",
		});
	});

	test('rejects an API key without the securityAudit:generate scope', async () => {
		const response = await testServer
			.publicApiAgentFor(unscopedOwner)
			.post('/audit')
			.send({})
			.expect(403);

		expect(response.body).toEqual({ message: 'Forbidden' });
	});
});
