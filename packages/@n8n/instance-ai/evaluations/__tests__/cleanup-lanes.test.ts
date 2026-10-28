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

	it('deletes the team build projects a build cleanup left, ignoring ones already gone', async () => {
		const deleteProject = vi
			.fn()
			.mockRejectedValueOnce(new Error('HTTP 404'))
			.mockResolvedValue(undefined);
		const lane = {
			...laneWithPool().lane,
			client: { deleteProject } as unknown as N8nClient,
			buildUserPool: undefined,
			teamBuildProjectIds: new Set(['p1', 'p2']),
		};

		await cleanupLanes([lane], { workflows: false, buildUsers: true }, silentLogger);

		expect(deleteProject.mock.calls.map(([id]) => id as string)).toEqual(['p1', 'p2']);
	});

	it('keeps the team build projects under --keep-workflows', async () => {
		const deleteProject = vi.fn();
		const lane = {
			...laneWithPool().lane,
			client: { deleteProject } as unknown as N8nClient,
			teamBuildProjectIds: new Set(['p1']),
		};

		await cleanupLanes([lane], { workflows: false, buildUsers: false }, silentLogger);

		expect(deleteProject).not.toHaveBeenCalled();
	});

	it('keeps the build users, and the workflows in their projects, under --keep-workflows', async () => {
		const { lane, buildUserPool, deleteUser } = laneWithPool();
		await buildUserPool.claim();

		await cleanupLanes([lane], { workflows: false, buildUsers: false }, silentLogger);

		expect(deleteUser).not.toHaveBeenCalled();
	});
});
