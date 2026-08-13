import { silentLogger } from './fixtures';
import type { N8nClient } from '../clients/n8n-client';
import { cleanupLaneUsers, LaneUserPool, provisionCaseBuildUser } from '../run/lane-users';
import type { TestCaseCredential } from '../types';

type InvitedUser = { id: string; email: string; acceptToken: string };

/** Owner-client stand-in that fulfills every invite and records the batches. */
function fakeOwnerClient() {
	const inviteBatches: string[][] = [];
	let nextId = 0;
	const inviteMembers = vi.fn(async (emails: string[]): Promise<InvitedUser[]> => {
		inviteBatches.push(emails);
		return await Promise.resolve(
			emails.map((email) => {
				nextId += 1;
				return { id: `u${String(nextId)}`, email, acceptToken: `token-${email}` };
			}),
		);
	});
	return { client: { inviteMembers } as unknown as N8nClient, inviteMembers, inviteBatches };
}

describe('LaneUserPool', () => {
	it('invites a chunk on first claim and serves later claims from the pool', async () => {
		const { client, inviteMembers } = fakeOwnerClient();
		const pool = new LaneUserPool(client, 4);

		const first = await pool.claim();
		const second = await pool.claim();

		expect(inviteMembers).toHaveBeenCalledTimes(1);
		expect(first.email).not.toBe(second.email);
		expect(pool.createdUserIds).toHaveLength(4);
	});

	it('shares one in-flight refill across concurrent claims on a drained pool', async () => {
		const { client, inviteMembers } = fakeOwnerClient();
		const pool = new LaneUserPool(client, 4);

		const users = await Promise.all([pool.claim(), pool.claim(), pool.claim(), pool.claim()]);

		expect(inviteMembers).toHaveBeenCalledTimes(1);
		expect(new Set(users.map((u) => u.email)).size).toBe(4);
	});

	it('refills again when concurrent claims outnumber one chunk', async () => {
		const { client, inviteMembers } = fakeOwnerClient();
		const pool = new LaneUserPool(client, 2);

		const users = await Promise.all(Array.from({ length: 5 }, async () => await pool.claim()));

		expect(new Set(users.map((u) => u.email)).size).toBe(5);
		expect(inviteMembers.mock.calls.length).toBeGreaterThanOrEqual(3);
		expect(pool.createdUserIds.length).toBe(inviteMembers.mock.calls.length * 2);
	});

	it('mints unique emails across refills', async () => {
		const { client, inviteBatches } = fakeOwnerClient();
		const pool = new LaneUserPool(client, 2);

		for (let i = 0; i < 5; i++) await pool.claim();

		const emails = inviteBatches.flat();
		expect(new Set(emails).size).toBe(emails.length);
	});

	it('records shells for cleanup and explains itself when a batch yields no accept token', async () => {
		// Mirrors an SMTP-configured lane: the shells exist server-side, but the
		// accept URL (and so the token) is withheld.
		const inviteMembers = vi.fn().mockResolvedValue([
			{ id: 'u1', email: 'a@b.invalid' },
			{ id: 'u2', email: 'c@d.invalid' },
		]);
		const pool = new LaneUserPool({ inviteMembers } as unknown as N8nClient, 2);

		await expect(pool.claim()).rejects.toThrow('none returned an accept token');
		expect(pool.createdUserIds).toEqual(['u1', 'u2']);
	});

	it('serves the token-bearing invites when only some of a batch carry one', async () => {
		const inviteMembers = vi.fn().mockResolvedValue([
			{ id: 'u1', email: 'a@b.invalid', error: 'already invited' },
			{ id: 'u2', email: 'c@d.invalid', acceptToken: 't2' },
		]);
		const pool = new LaneUserPool({ inviteMembers } as unknown as N8nClient, 2);

		await expect(pool.claim()).resolves.toMatchObject({ id: 'u2' });
		expect(pool.createdUserIds).toEqual(['u1', 'u2']);
	});

	it('rejects waiting claims when the invite fails, then recovers', async () => {
		const inviteMembers = vi
			.fn()
			.mockRejectedValueOnce(new Error('invite exploded'))
			.mockResolvedValue([{ id: 'u1', email: 'a@b.invalid', acceptToken: 't' }]);
		const pool = new LaneUserPool({ inviteMembers } as unknown as N8nClient, 1);

		await expect(pool.claim()).rejects.toThrow('invite exploded');
		await expect(pool.claim()).resolves.toMatchObject({ id: 'u1' });
	});
});

describe('provisionCaseBuildUser', () => {
	function fakeMemberClient() {
		const created: Array<{ name: string; type: string }> = [];
		const member = {
			acceptInvitation: vi.fn().mockResolvedValue(undefined),
			rotateMcpApiKey: vi.fn().mockResolvedValue('mcp-key-1'),
			createCredential: vi.fn(async (name: string, type: string) => {
				created.push({ name, type });
				return await Promise.resolve({ id: `cred-${String(created.length)}` });
			}),
		};
		return { member, client: member as unknown as N8nClient, created };
	}

	it("accepts the pooled invite as the member and returns that user's MCP key", async () => {
		const { client: ownerClient } = fakeOwnerClient();
		const pool = new LaneUserPool(ownerClient, 1);
		const { member, client } = fakeMemberClient();

		const mcpApiKey = await provisionCaseBuildUser({
			pool,
			memberClient: client,
			onCredentialCreated: () => {},
		});

		expect(member.acceptInvitation).toHaveBeenCalledTimes(1);
		const acceptArgs = member.acceptInvitation.mock.calls[0][0] as {
			token: string;
			password: string;
		};
		expect(acceptArgs.password).toBe(pool.password);
		expect(acceptArgs.token).toContain('token-');
		expect(mcpApiKey).toBe('mcp-key-1');
		expect(member.createCredential).not.toHaveBeenCalled();
	});

	it('seeds declared credentials via the member client and reports each id', async () => {
		const { client: ownerClient } = fakeOwnerClient();
		const pool = new LaneUserPool(ownerClient, 1);
		const { client, created } = fakeMemberClient();
		const credentials: TestCaseCredential[] = [{ type: 'slackApi' }, { type: 'notionApi' }];
		const reported: string[] = [];

		await provisionCaseBuildUser({
			pool,
			memberClient: client,
			credentials,
			onCredentialCreated: (id) => reported.push(id),
		});

		expect(created.map((c) => c.type)).toEqual(['slackApi', 'notionApi']);
		expect(reported).toEqual(['cred-1', 'cred-2']);
	});

	it('propagates credential-seeding failures so the build fails instead of skewing', async () => {
		const { client: ownerClient } = fakeOwnerClient();
		const pool = new LaneUserPool(ownerClient, 1);
		const { member, client } = fakeMemberClient();
		member.createCredential.mockRejectedValueOnce(new Error('credential POST failed'));

		await expect(
			provisionCaseBuildUser({
				pool,
				memberClient: client,
				credentials: [{ type: 'slackApi' }],
				onCredentialCreated: () => {},
			}),
		).rejects.toThrow('credential POST failed');
	});
});

describe('cleanupLaneUsers', () => {
	it('deletes every invited user best-effort, surviving individual failures', async () => {
		const { client: ownerClient } = fakeOwnerClient();
		const pool = new LaneUserPool(ownerClient, 3);
		await pool.claim();

		const deleteUser = vi.fn().mockRejectedValueOnce(new Error('409')).mockResolvedValue(undefined);
		await cleanupLaneUsers({ deleteUser } as unknown as N8nClient, pool, silentLogger);

		expect(deleteUser).toHaveBeenCalledTimes(3);
	});
});
