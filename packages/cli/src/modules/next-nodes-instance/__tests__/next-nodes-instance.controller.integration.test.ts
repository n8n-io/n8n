import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import type { ContractStore } from '@n8n/node-sdk/registry';
import { mock } from 'vitest-mock-extended';

import { contractActionOf, NodeContractsStore } from '@/node-contracts-registry';

import {
	createChatUser,
	createMember,
	createOwner,
} from '../../../../test/integration/shared/db/users';
import { setupTestServer } from '../../../../test/integration/shared/utils';

vi.mock('@/node-contracts-registry', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/node-contracts-registry')>()),
	contractActionOf: vi.fn(),
}));

const digest = `sha256:${'a'.repeat(64)}`;
const versions = [
	{ version: '1.1.0', digest, nodeContract: '2.11.0' as const },
	{ version: '1.0.0', digest, nodeContract: '2.11.0' as const, withdrawn: 'yanked' as const },
];
const store = mock<ContractStore>();
mockInstance(NodeContractsStore, { open: async () => store });

const testServer = setupTestServer({ endpointGroups: ['next-nodes-instance'] });

const url = '/next-nodes/instance/node-versions';
const query = {
	type: 'n8n-nodes-base.slack',
	typeVersion: 1,
	resource: 'message',
	operation: 'post',
};
const users: Record<'owner' | 'member' | 'chatUser', User> = {} as never;

beforeAll(async () => {
	Object.assign(users, {
		owner: await createOwner(),
		member: await createMember(),
		chatUser: await createChatUser(),
	});
});

beforeEach(() => {
	vi.mocked(contractActionOf).mockImplementation((_loaders, { type, typeVersion }) =>
		type === query.type ? { id: 'slack.message.post', major: typeVersion } : undefined,
	);
	store.majorVersionsOf.mockImplementation(async (_actionId, major) =>
		major === 1 ? versions : [],
	);
});

describe('GET /next-nodes/instance/node-versions', () => {
	it('lists the versions of the action major of a node for a member', async () => {
		const response = await testServer.authAgentFor(users.member).get(url).query(query);

		expect(response.status).toBe(200);
		expect(response.body.data).toEqual(versions);
		expect(contractActionOf).toHaveBeenCalledWith(expect.anything(), {
			type: query.type,
			typeVersion: 1,
			parameters: { resource: 'message', operation: 'post' },
		});
		expect(store.majorVersionsOf).toHaveBeenCalledWith('slack.message.post', 1);
	});

	it('refuses a chat user', async () => {
		const response = await testServer.authAgentFor(users.chatUser).get(url).query(query);

		expect(response.status).toBe(403);
	});

	it.each(['x', '-1', '1.5', undefined])('refuses the typeVersion %s', async (typeVersion) => {
		const response = await testServer
			.authAgentFor(users.owner)
			.get(url)
			.query({ ...query, typeVersion });

		expect(response.status).toBe(400);
	});

	it('gives 404 for a node that is not a contract node', async () => {
		const response = await testServer
			.authAgentFor(users.owner)
			.get(url)
			.query({ ...query, type: 'n8n-nodes-base.set' });

		expect(response.status).toBe(404);
	});

	it('gives 404 for a major with no version', async () => {
		const response = await testServer
			.authAgentFor(users.owner)
			.get(url)
			.query({ ...query, typeVersion: 2 });

		expect(response.status).toBe(404);
	});
});
