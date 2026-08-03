// ---------------------------------------------------------------------------
// User provisioning
//
// The whole point of this harness is that each virtual user is a *distinct*
// n8n user, so the backend's per-user state (LocalGatewayRegistry.userGateways,
// browser sessions, thread ownership) actually multiplies. That means N real
// accounts, each with its own `n8n-auth` cookie.
//
// Strategy is reuse-first: identities are deterministic, so a second run logs
// straight in and issues zero invitations. That matters on cloud, where
// POST /rest/invitations is IP-rate-limited to 10 and re-accepting a consumed
// invite is an error.
// ---------------------------------------------------------------------------

import { readFile } from 'node:fs/promises';
import { z } from 'zod';

import { DEFAULT_USER_EMAIL_DOMAIN, DEFAULT_USER_EMAIL_PREFIX } from './args';
import { describeError } from './sampler';
import { N8nClient } from '../evaluations/clients/n8n-client';
import { runWithConcurrency } from '../evaluations/harness/cleanup';
import type { EvalLogger } from '../evaluations/harness/logger';

/** Well under the production limit of 100/min on /rest/invitations/accept. */
const ACCEPT_CONCURRENCY = 4;

/** Logins are cheap but each is a bcrypt verify server-side; don't stampede. */
const LOGIN_CONCURRENCY = 8;

export interface LoadTestUser {
	index: number;
	email: string;
	password: string;
	/** Present when we invited them this run, or when supplied by --users-file. */
	id?: string;
	/** Authenticated client — one per user, so one cookie per user. */
	client: N8nClient;
}

export interface ProvisionResult {
	users: LoadTestUser[];
	invited: number;
	reused: number;
	failed: Array<{ email: string; reason: string }>;
}

export interface ProvisionOptions {
	baseUrl: string;
	count: number;
	password: string;
	logger: EvalLogger;
	/** Owner/admin client used to issue invitations. Never used for accepts. */
	ownerClient: N8nClient;
	/** Suffix for fresh identities (--reset-users). */
	identitySuffix?: string;
	/** Path to a JSON file of pre-created users (cloud, SSO, quota-capped plans). */
	usersFile?: string;
}

const UsersFileSchema = z.array(
	z.object({
		email: z.string().min(1),
		password: z.string().min(1),
		id: z.string().optional(),
	}),
);

export function userEmail(index: number, suffix?: string): string {
	const ordinal = String(index).padStart(3, '0');
	const tag = suffix === undefined ? '' : `-${suffix}`;
	return `${DEFAULT_USER_EMAIL_PREFIX}${ordinal}${tag}@${DEFAULT_USER_EMAIL_DOMAIN}`;
}

/**
 * Get `count` authenticated users, creating any that don't exist yet.
 *
 * Never throws for a partially-successful provision: the caller decides whether
 * the users it got are enough, since a run at 8 of 10 users is still useful
 * data as long as the report says so.
 */
export async function provisionUsers(options: ProvisionOptions): Promise<ProvisionResult> {
	const { logger } = options;

	const identities =
		options.usersFile === undefined
			? Array.from({ length: options.count }, (_, index) => ({
					index,
					email: userEmail(index, options.identitySuffix),
					password: options.password,
					id: undefined as string | undefined,
				}))
			: await readUsersFile(options.usersFile, options.count, logger);

	// Pass 1 — try logging in. Anything that works needs no invitation.
	const loginResults = await runWithConcurrency(
		identities,
		async (identity) => {
			const client = new N8nClient(options.baseUrl);
			try {
				await client.login(identity.email, identity.password);
				return { identity, client, loggedIn: true as const };
			} catch {
				return { identity, client: undefined, loggedIn: false as const };
			}
		},
		LOGIN_CONCURRENCY,
	);

	const users: LoadTestUser[] = [];
	const failed: ProvisionResult['failed'] = [];
	let reused = 0;

	for (const result of loginResults) {
		if (result.loggedIn) {
			users.push({ ...result.identity, client: result.client });
			reused++;
		}
	}

	const missing = loginResults
		.filter((result) => !result.loggedIn)
		.map((result) => result.identity);

	if (missing.length > 0 && options.usersFile !== undefined) {
		// We can't create these — the file is the source of truth.
		for (const identity of missing) {
			failed.push({ email: identity.email, reason: 'login failed (from --users-file)' });
		}
		logger.warn(
			`${missing.length} of ${identities.length} users from --users-file could not log in`,
		);
	}

	let invited = 0;
	if (missing.length > 0 && options.usersFile === undefined) {
		logger.info(`Inviting ${missing.length} user(s) (${reused} reused)`);
		const created = await inviteAndAccept(missing, options, failed);
		users.push(...created);
		invited = created.length;
	} else if (missing.length === 0) {
		logger.info(`Reused all ${reused} existing load-test user(s) — no invitations issued`);
	}

	users.sort((a, b) => a.index - b.index);
	return { users, invited, reused, failed };
}

interface Identity {
	index: number;
	email: string;
	password: string;
	id?: string;
}

/**
 * One batched invite request, then a per-user accept on that user's own client.
 * The batching is what keeps this inside the production rate limit.
 */
async function inviteAndAccept(
	missing: Identity[],
	options: ProvisionOptions,
	failed: ProvisionResult['failed'],
): Promise<LoadTestUser[]> {
	const { logger } = options;

	let invitedUsers;
	try {
		invitedUsers = await options.ownerClient.inviteUsers(
			missing.map((identity) => ({ email: identity.email, role: 'global:member' as const })),
		);
	} catch (error) {
		const reason = describeError(error);
		logger.error(`Batch invitation failed: ${reason}`);
		for (const identity of missing) failed.push({ email: identity.email, reason });
		return [];
	}

	const byEmail = new Map(invitedUsers.map((user) => [user.email.toLowerCase(), user]));

	const accepted = await runWithConcurrency(
		missing,
		async (identity): Promise<LoadTestUser | undefined> => {
			const invited = byEmail.get(identity.email.toLowerCase());
			if (!invited) {
				failed.push({ email: identity.email, reason: 'not present in invitation response' });
				return undefined;
			}

			const token = extractInviteToken(invited.inviteAcceptUrl);
			if (token === undefined) {
				failed.push({
					email: identity.email,
					reason: 'invitation carried no accept token (already accepted?)',
				});
				return undefined;
			}

			// A fresh client per accept: the endpoint issues a cookie for the
			// accepting user, which would hijack the owner's session.
			const client = new N8nClient(options.baseUrl);
			try {
				await client.acceptInvitation(token, 'Load', `Test${identity.index}`, identity.password);
			} catch (error) {
				failed.push({ email: identity.email, reason: describeError(error) });
				return undefined;
			}

			return { ...identity, id: invited.id, client };
		},
		ACCEPT_CONCURRENCY,
	);

	return accepted.filter((user): user is LoadTestUser => user !== undefined);
}

/** The accept token rides in the `?token=` query param of `inviteAcceptUrl`. */
export function extractInviteToken(inviteAcceptUrl: string | undefined): string | undefined {
	if (inviteAcceptUrl === undefined || inviteAcceptUrl === '') return undefined;
	try {
		const token = new URL(inviteAcceptUrl).searchParams.get('token');
		return token === null || token === '' ? undefined : token;
	} catch {
		return undefined;
	}
}

async function readUsersFile(path: string, count: number, logger: EvalLogger): Promise<Identity[]> {
	const raw = await readFile(path, 'utf8');

	let decoded: unknown;
	try {
		decoded = JSON.parse(raw);
	} catch {
		// Don't echo the content — the file holds passwords.
		throw new Error('--users-file is not valid JSON');
	}

	const parsed = UsersFileSchema.safeParse(decoded);
	if (!parsed.success) {
		throw new Error('--users-file has an unexpected shape (expected [{ email, password }])');
	}
	if (parsed.data.length < count) {
		throw new Error(`--users-file has ${parsed.data.length} user(s) but ${count} requested`);
	}
	if (parsed.data.length > count) {
		logger.info(`Using the first ${count} of ${parsed.data.length} users from --users-file`);
	}
	return parsed.data.slice(0, count).map((entry, index) => ({ index, ...entry }));
}

/**
 * Best-effort teardown of users we created. Never called with --users-file.
 * Failures are logged, not thrown — a stuck user must not fail the run's report.
 */
export async function deleteProvisionedUsers(
	ownerClient: N8nClient,
	users: LoadTestUser[],
	logger: EvalLogger,
): Promise<number> {
	let deleted = 0;
	for (const user of users) {
		if (user.id === undefined) {
			logger.verbose(`Skipping delete for ${user.email} — no user id recorded`);
			continue;
		}
		try {
			await ownerClient.deleteUser(user.id);
			deleted++;
		} catch (error) {
			logger.warn(`Failed to delete ${user.email}: ${describeError(error)}`);
		}
	}
	return deleted;
}
