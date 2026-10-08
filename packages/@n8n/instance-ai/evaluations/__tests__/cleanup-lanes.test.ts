import { vi } from 'vitest';

import { silentLogger } from './fixtures';
import type { N8nClient } from '../clients/n8n-client';
import type { Lane } from '../run/build-orchestrator';
import { cleanupLanes } from '../run/lane-setup';
import { LaneUserPool } from '../run/lane-users';

function laneWithPool() {
	const deleteUser = vi.fn().mockResolvedValue(undefined);
	const inviteMembers = vi.fn(
		async (emails: string[]) =>
			await Promise.resolve(
				emails.map((email, i) => ({ id: `u${String(i + 1)}`, email, acceptToken: 'token' })),
			),
	);
	const client = { deleteUser, inviteMembers } as unknown as N8nClient;
	const buildUserPool = new LaneUserPool(client, 3);
	const lane = {
		client,
		baseUrl: 'http://n8n.test',
		preRunWorkflowIds: new Set<string>(),
		claimedWorkflowIds: new Set<string>(),
		createdCredentialIds: new Set<string>(),
		workflowIdsToDelete: new Set<string>(),
		buildUserPool,
	} as Lane;
	return { lane, buildUserPool, deleteUser };
}

describe('cleanupLanes', () => {
	it('deletes every invited build user, claimed or not, when workflows are throwaway', async () => {
		const { lane, buildUserPool, deleteUser } = laneWithPool();
		await buildUserPool.claim();

		await cleanupLanes([lane], { workflows: false, buildUsers: true }, silentLogger);

		expect(deleteUser.mock.calls.map(([id]) => id as string)).toEqual(['u1', 'u2', 'u3']);
	});

	it('keeps the build users, and the workflows in their projects, under --keep-workflows', async () => {
		const { lane, buildUserPool, deleteUser } = laneWithPool();
		await buildUserPool.claim();

		await cleanupLanes([lane], { workflows: false, buildUsers: false }, silentLogger);

		expect(deleteUser).not.toHaveBeenCalled();
	});
});
