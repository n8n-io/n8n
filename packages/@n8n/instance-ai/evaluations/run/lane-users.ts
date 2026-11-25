// ---------------------------------------------------------------------------
// Per-build users. `--build-via-mcp` builds act as a fresh member. Orchestrator
// builds keep the owner and, on an unlicensed instance, run in a fresh member's
// personal project, the only new project it can create. n8n then hides execution
// output from the owner; a licensed lane uses a team project instead.
// ---------------------------------------------------------------------------

import { randomBytes } from 'crypto';

import type { Lane } from './build-orchestrator';
import { N8nClient } from '../clients/n8n-client';
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
			return `eval-build-${this.nonce}-${String(this.seq)}@n8n-evals.invalid`;
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
 * mint the member's MCP API key, and create the case's declared credentials in
 * their personal project. Returns the key and the member's id. Throws on any
 * step so a partial setup fails the build instead of skewing it.
 */
export async function provisionCaseBuildUser(opts: {
	pool: LaneUserPool;
	/** A fresh, logged-out client for the lane — accepting the invite logs it in. */
	memberClient: N8nClient;
	credentials?: TestCaseCredential[];
	onCredentialCreated: (id: string) => void;
	logger?: EvalLogger;
}): Promise<{ mcpApiKey: string; userId: string }> {
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
	return { mcpApiKey, userId: user.id };
}

/** A team build project, or a member's personal project (`userId` set). */
export interface BuildProject {
	userId?: string;
	projectId: string;
}

/** Marks a team build project so cleanup can tell it from seeded or real projects.
 *  The agent never sees a project's icon, and the editor offers no such icon. */
export const BUILD_PROJECT_ICON = { type: 'icon', value: 'eval-build-project' } as const;

/** How each build on this lane gets a fresh project: a team project the owner
 *  creates (and so administers, which keeps execution output visible to it), else a
 *  pooled member's personal project. Named like the owner, so the agent's project
 *  line reads as it does for a real user. */
export function buildProjectProvider(
	lane: Pick<Lane, 'client' | 'baseUrl' | 'buildUserPool' | 'teamBuildProjects'>,
): (() => Promise<BuildProject>) | undefined {
	const name = lane.client.userName ?? { firstName: 'Eval', lastName: 'Builder' };
	if (lane.teamBuildProjects) {
		return async () => {
			const { id } = await lane.client.createTeamProject(
				`${name.firstName} ${name.lastName}`,
				BUILD_PROJECT_ICON,
			);
			return { projectId: id };
		};
	}
	const pool = lane.buildUserPool;
	if (!pool) return undefined;
	return async () =>
		await provisionBuildProject({ pool, memberClient: new N8nClient(lane.baseUrl), name });
}

/** Delete every marked team build project on the instance: a crashed run's
 *  leftovers at lane setup, and what a failed build cleanup left at the run end.
 *  With team projects licensed, the agent's project list shows every project,
 *  so a leftover would be visible to later cases. */
export async function deleteTeamBuildProjects(client: N8nClient, logger: EvalLogger) {
	const projects = await client.listTeamProjects();
	for (const project of projects) {
		if (
			project.icon?.type !== BUILD_PROJECT_ICON.type ||
			project.icon.value !== BUILD_PROJECT_ICON.value
		) {
			continue;
		}
		try {
			await client.deleteProject(project.id);
		} catch (error: unknown) {
			logger.warn(
				`Could not delete build project ${project.id}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
}

/** Accept a pooled invite and return that user's personal project, so a build
 *  starts in a project no other build has touched. */
export async function provisionBuildProject(opts: {
	pool: LaneUserPool;
	/** A fresh, logged-out client for the lane — accepting the invite logs it in. */
	memberClient: N8nClient;
	/** Becomes the project name the agent sees. */
	name: { firstName: string; lastName: string };
}): Promise<BuildProject> {
	const { pool, memberClient } = opts;
	const user = await pool.claim();
	await memberClient.acceptInvitation({
		token: user.acceptToken,
		...opts.name,
		password: pool.password,
	});
	return { userId: user.id, projectId: await memberClient.getPersonalProjectId() };
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
	logger.verbose(`Deleted ${String(deleted)}/${String(ids.length)} build user(s)`);
}
