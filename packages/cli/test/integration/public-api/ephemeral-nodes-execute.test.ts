
import { mockInstance, getPersonalProject } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import type { ApiKeyScope } from '@n8n/permissions';
import { UserError } from 'n8n-workflow';

import { EphemeralNodeExecutor } from '@/node-execution/ephemeral-node-executor';
import handlers from '@/public-api/v1/handlers/ephemeral-nodes/ephemeral-nodes.handler';

import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

const mockExecutor = mockInstance(EphemeralNodeExecutor);

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });

let owner: User;
let member: User;

let unscopedOwner: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let authUnscopedAgent: SuperAgentTest;
let ownerPersonalProjectId: string;

const EPHEMERAL_NODE_SCOPES: ApiKeyScope[] = ['ephemeralNode:execute'];

const validPayload = {
	nodeType: 'n8n-nodes-base.httpRequest',
	nodeTypeVersion: 4,
	nodeParameters: { url: 'https://api.example.com' },
};

beforeAll(async () => {
	owner = await createOwnerWithApiKey({ scopes: EPHEMERAL_NODE_SCOPES });
	member = await createMemberWithApiKey({ scopes: EPHEMERAL_NODE_SCOPES });
	// Holds a non-ephemeralNode scope so the key lacks ephemeralNode:execute
	unscopedOwner = await createOwnerWithApiKey({ scopes: ['workflow:list' as ApiKeyScope] });

	ownerPersonalProjectId = (await getPersonalProject(owner)).id;

	// Default executor behaviour — individual tests override with mockImplementationOnce
	mockExecutor.validateNodeForExecution.mockReturnValue(undefined);
	mockExecutor.executeInline.mockResolvedValue({ status: 'success', data: [] });
});

beforeEach(() => {
	// Clears call history while preserving the default implementations set in beforeAll
	jest.clearAllMocks();

	authOwnerAgent = testServer.publicApiAgentFor(owner);
	authMemberAgent = testServer.publicApiAgentFor(member);
	authUnscopedAgent = testServer.publicApiAgentFor(unscopedOwner);
});

describe('POST /ephemeral-nodes/execute', () => {
	describe('authorization', () => {
		test('returns 401 without API key', async () => {
			await testServer
				.publicApiAgentWithoutApiKey()
				.post('/ephemeral-nodes/execute')
				.send(validPayload)
				.expect(401);
		});

		test('returns 403 when API key lacks ephemeralNode:execute scope', async () => {
			await authUnscopedAgent.post('/ephemeral-nodes/execute').send(validPayload).expect(403);

			expect(mockExecutor.executeInline).not.toHaveBeenCalled();
		});

		test('owner with ephemeralNode:execute scope is allowed', async () => {
			await authOwnerAgent.post('/ephemeral-nodes/execute').send(validPayload).expect(200);
		});

		test('member with ephemeralNode:execute scope is allowed', async () => {
			await authMemberAgent.post('/ephemeral-nodes/execute').send(validPayload).expect(200);
		});
	});

	describe('request validation — HTTP 400', () => {
		test('rejects malformed body missing required fields', async () => {
			await authOwnerAgent
				.post('/ephemeral-nodes/execute')
				.send({ nodeParameters: {} })
				.expect(400);

			expect(mockExecutor.validateNodeForExecution).not.toHaveBeenCalled();
			expect(mockExecutor.executeInline).not.toHaveBeenCalled();
		});

		test('rejects trigger nodes with 400', async () => {
			mockExecutor.validateNodeForExecution.mockImplementationOnce(() => {
				throw new UserError('Trigger nodes cannot be executed standalone');
			});

			await authOwnerAgent
				.post('/ephemeral-nodes/execute')
				.send({ ...validPayload, nodeType: 'n8n-nodes-base.webhook' })
				.expect(400);

			expect(mockExecutor.executeInline).not.toHaveBeenCalled();
		});

		test('rejects blacklisted operations with 400', async () => {
			mockExecutor.validateNodeForExecution.mockImplementationOnce(() => {
				throw new UserError('The "sendAndWait" is not supported for agent tool execution.');
			});

			await authOwnerAgent
				.post('/ephemeral-nodes/execute')
				.send({ ...validPayload, nodeParameters: { operation: 'sendAndWait' } })
				.expect(400);

			expect(mockExecutor.executeInline).not.toHaveBeenCalled();
		});
	});

	describe('execution', () => {
		test('returns 200 with status:success and mapped output data', async () => {
			mockExecutor.executeInline.mockResolvedValueOnce({
				status: 'success',
				data: [{ json: { statusCode: 200, body: 'ok' } }],
			});

			const response = await authOwnerAgent
				.post('/ephemeral-nodes/execute')
				.send(validPayload)
				.expect(200);

			expect(response.body).toMatchObject({
				status: 'success',
				data: [{ statusCode: 200, body: 'ok' }],
			});
		});

		test("forwards the caller's personal projectId to executeInline", async () => {
			await authOwnerAgent.post('/ephemeral-nodes/execute').send(validPayload).expect(200);

			expect(mockExecutor.executeInline).toHaveBeenCalledWith(
				expect.objectContaining({ projectId: ownerPersonalProjectId }),
			);
		});

		test('returns 200 with status:error when node execution fails at runtime', async () => {
			mockExecutor.executeInline.mockResolvedValueOnce({
				status: 'error',
				data: [],
				error: 'Request failed with status code 404',
			});

			const response = await authOwnerAgent
				.post('/ephemeral-nodes/execute')
				.send(validPayload)
				.expect(200);

			expect(response.body).toMatchObject({
				status: 'error',
				data: [],
				error: 'Request failed with status code 404',
			});
		});
	});

	describe('executeEphemeralNode handler middleware', () => {
		test('handler is scope-gated with ephemeralNode:execute', () => {
			const middlewareChain = handlers.executeEphemeralNode as unknown as Array<
				Record<string, unknown>
			>;
			const hasScopedMiddleware = middlewareChain.some(
				(mw) => typeof mw === 'function' && '__apiKeyScope' in mw,
			);

			expect(hasScopedMiddleware).toBe(true);
		});
	});
});
