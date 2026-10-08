import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import type { ContractStore } from '@n8n/node-sdk/registry';
import { mock } from 'vitest-mock-extended';

import { NodeContractsStore } from '@/node-contracts-registry';

import {
	createChatUser,
	createMember,
	createOwner,
} from '../../../../test/integration/shared/db/users';
import { setupTestServer } from '../../../../test/integration/shared/utils';

const digest = `sha256:${'a'.repeat(64)}`;
const versions = [
	{ version: '1.1.0', digest, nodeContract: '2.11.0' as const },
	{ version: '1.0.0', digest, nodeContract: '2.11.0' as const, withdrawn: 'yanked' as const },
];
const store = mock<ContractStore>();
mockInstance(NodeContractsStore, { open: async () => store });

const testServer = setupTestServer({ endpointGroups: ['next-nodes-instance'] });

const url = '/next-nodes/instance/actions/acme.greeting.get/versions';
const users: Record<'owner' | 'member' | 'chatUser', User> = {} as never;

beforeAll(async () => {
	Object.assign(users, {
		owner: await createOwner(),
		member: await createMember(),
		chatUser: await createChatUser(),
	});
});

beforeEach(() => {
	store.majorVersionsOf.mockImplementation(async (_actionId, major) =>
		major === 1 ? versions : [],
	);
});

describe('GET /next-nodes/instance/actions/:actionId/versions', () => {
	it('lists the versions of an action major for a member', async () => {
		const response = await testServer.authAgentFor(users.member).get(url).query({ major: 1 });

		expect(response.status).toBe(200);
		expect(response.body.data).toEqual(versions);
		expect(store.majorVersionsOf).toHaveBeenCalledWith('acme.greeting.get', 1);
	});

	it('refuses a chat user', async () => {
		const response = await testServer.authAgentFor(users.chatUser).get(url).query({ major: 1 });

		expect(response.status).toBe(403);
	});

	it.each(['x', '-1', '1.5', undefined])('refuses the major %s', async (major) => {
		const response = await testServer.authAgentFor(users.owner).get(url).query({ major });

		expect(response.status).toBe(400);
	});

	it('gives 404 for a major with no version', async () => {
		const response = await testServer.authAgentFor(users.owner).get(url).query({ major: 2 });

		expect(response.status).toBe(404);
	});
});
