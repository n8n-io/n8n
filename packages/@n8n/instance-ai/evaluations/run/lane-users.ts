// ---------------------------------------------------------------------------
// Per-case build users for `--build-via-mcp`.
//
// MCP credential/workflow visibility is user-scoped, so running each build as
// its own freshly-invited member gives it an isolated credential view holding
// exactly the case's declared credentials — the MCP analog of the
// orchestrator's per-thread credential pinning.
// ---------------------------------------------------------------------------

import { randomBytes } from 'crypto';

import type { N8nClient } from '../clients/n8n-client';
import { createDeclaredCredentials } from '../credentials/seeder';
import type { EvalLogger } from '../harness/logger';
import type { TestCaseCredential } from '../types';

export interface InvitedCaseUser {
	id: string;
	email: string;
	acceptToken: string;
}

const INVITE_CHUNK_SIZE = 8;

export class LaneUserPool {
	private readonly available: InvitedCaseUser[] = [];

	private refill?: Promise<void>;

	/** Every user this pool invited (accepted or not), for post-run deletion. */
	readonly createdUserIds: string[] = [];

	private seq = 0;

	private readonly nonce = randomBytes(4).toString('hex');

	/** Shared by this pool's throwaway members; random per run. */
	readonly password = `Eval1!${randomBytes(12).toString('hex')}`;

	constructor(
		private readonly ownerClient: N8nClient,
		private readonly chunkSize = INVITE_CHUNK_SIZE,
	) {}

	/** Claim an invited-but-unaccepted user, inviting a fresh chunk when the
	 *  pool runs dry. Concurrent claims share one in-flight refill. */
	async claim(): Promise<InvitedCaseUser> {
		let user = this.available.pop();
		while (!user) {
			this.refill ??= this.doRefill().finally(() => (this.refill = undefined));
			await this.refill;
			user = this.available.pop();
		}
		return user;
	}

	private async doRefill(): Promise<void> {
		// One batched POST per chunk — /rest/invitations is IP-rate-limited in production.
		const emails = Array.from({ length: this.chunkSize }, () => {
			this.seq += 1;
			return `eval-mcp-${this.nonce}-${String(this.seq)}@n8n-evals.invalid`;
		});
		const invited = await this.ownerClient.inviteMembers(emails);
		// Record every shell before judging usability: n8n creates them all up
		// front, so even an unusable batch has to be deleted after the run.
		for (const user of invited) this.createdUserIds.push(user.id);

		const usable = invited.filter(
			(user): user is InvitedCaseUser => user.acceptToken !== undefined,
		);
		this.available.push(...usable);
		if (usable.length === 0) {
			const reason = invited.map((user) => user.error).find(Boolean);
			throw new Error(
				`Invited ${String(invited.length)} user(s) but none returned an accept token${reason ? ` (${reason})` : ''} — the lane must run without SMTP and without N8N_INVITE_LINKS_EMAIL_ONLY for the eval build-user flow`,
			);
		}
	}
}

/**
 * Accept a pooled invitation (which logs the fresh client in as the member),
 * mint and return the member's MCP API key, and create the case's declared
 * credentials in their personal project. Throws on any step so a partial setup
 * fails the build instead of skewing it.
 */
export async function provisionCaseBuildUser(opts: {
	pool: LaneUserPool;
	/** A fresh, logged-out client for the lane — accepting the invite logs it in. */
	memberClient: N8nClient;
	credentials?: TestCaseCredential[];
	onCredentialCreated: (id: string) => void;
	logger?: EvalLogger;
}): Promise<string> {
	const { pool, memberClient } = opts;
	const user = await pool.claim();
	await memberClient.acceptInvitation({
		token: user.acceptToken,
		firstName: 'Eval',
		lastName: 'Builder',
		password: pool.password,
	});
	const mcpApiKey = await memberClient.rotateMcpApiKey();
	await createDeclaredCredentials(memberClient, opts.credentials ?? [], {
		onCreated: opts.onCredentialCreated,
		logger: opts.logger,
	});
	return mcpApiKey;
}

/** Best-effort deletion of the pool's users. Deleting a user also deletes
 *  what's left in their personal project, so only call this when built
 *  workflows are throwaway. */
export async function cleanupLaneUsers(
	ownerClient: N8nClient,
	pool: LaneUserPool,
	logger: EvalLogger,
): Promise<void> {
	const ids = pool.createdUserIds;
	if (ids.length === 0) return;
	let deleted = 0;
	// Sequential, like cleanupCredentials: each delete cascades server-side and
	// this runs after the last verdict, so nothing waits on it.
	for (const id of ids) {
		try {
			await ownerClient.deleteUser(id);
			deleted++;
		} catch {
			// best-effort
		}
	}
	logger.verbose(`Deleted ${String(deleted)}/${String(ids.length)} MCP build user(s)`);
}
