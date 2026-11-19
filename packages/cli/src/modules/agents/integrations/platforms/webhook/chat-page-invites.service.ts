import { Logger } from '@n8n/backend-common';
import { UrlService } from '@n8n/backend-services';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { createHash, randomBytes, randomUUID } from 'node:crypto';

import type { ChatPageUser, ChatSurfaceName } from './webhook-channel.service';

/**
 * SPIKE (agent-chat-embed): magic links per recipient for the chat page.
 * Follows the security proposal (.brazier/spike/notes/security-proposal.md §3.2):
 * 256-bit token in the URL fragment, stored as SHA-256, bound to one agent and one
 * recipient, multi-use until it expires or is revoked. Opening it gives an opaque
 * session (cookie) for the principal `invite-<id>`.
 * ponytail: invites and sessions live in the settings table as JSON (no migration);
 * the product needs real tables and a cache in front of the session lookup.
 */
export interface ChatPageInvite {
	id: string;
	label: string;
	tokenHash: string;
	createdAt: string;
	expiresAt: string;
	revokedAt?: string;
	uses: number;
	lastUsedAt?: string;
}

export type InviteFailure = 'invite_invalid' | 'invite_expired' | 'invite_revoked';

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
/** Invites and sessions belong to one surface of one agent: a link for v1 does not open option B. */
const scopeOf = (agentId: string, surface: ChatSurfaceName) =>
	surface === 'chat' ? agentId : `${agentId}.${surface}`;

@Service()
export class ChatPageInviteService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly urlService: UrlService,
		private readonly logger: Logger,
	) {}

	async list(agentId: string, surface: ChatSurfaceName): Promise<ChatPageInvite[]> {
		const row = await this.settingsRepository.findByKey(
			`agentChatInvites.${scopeOf(agentId, surface)}`,
		);
		return row ? (JSON.parse(row.value) as ChatPageInvite[]) : [];
	}

	/** Creates a link and writes it to the server log: the spike's stand-in for sending an email. */
	async create(agentId: string, surface: ChatSurfaceName, label: string, ttlMs = DEFAULT_TTL_MS) {
		const token = randomBytes(32).toString('base64url');
		const now = Date.now();
		const invite: ChatPageInvite = {
			id: randomUUID(),
			label,
			tokenHash: sha256(token),
			createdAt: new Date(now).toISOString(),
			expiresAt: new Date(now + ttlMs).toISOString(),
			uses: 0,
		};
		// ponytail: read-modify-write of one JSON row; concurrent creates can lose one.
		await this.save(agentId, surface, [...(await this.list(agentId, surface)), invite]);
		// The fragment never reaches servers, logs or Referer headers.
		const link = `${this.urlService.getAgentWebhookUrl(agentId)}/${surface}#invite=${token}`;
		this.logger.warn(
			`[SPIKE agent-chat-embed, DEV ONLY, no email sent] Magic link for "${label}" (expires ${invite.expiresAt}): ${link}`,
		);
		// The caller shows the link once; only its hash is stored.
		return { invite, link };
	}

	async revoke(agentId: string, surface: ChatSurfaceName, inviteId: string) {
		const invites = await this.list(agentId, surface);
		const invite = invites.find((entry) => entry.id === inviteId);
		if (invite && !invite.revokedAt) invite.revokedAt = new Date().toISOString();
		await this.save(agentId, surface, invites);
	}

	/** Checks a link token. Does not consume it: links are multi-use until expiry or revoke. */
	async check(
		agentId: string,
		surface: ChatSurfaceName,
		token: string,
	): Promise<ChatPageInvite | InviteFailure> {
		const invite = (await this.list(agentId, surface)).find(
			(entry) => entry.tokenHash === sha256(token),
		);
		return invite ? this.state(invite) : 'invite_invalid';
	}

	/** Exchanges a link token for a new opaque session token. */
	async exchange(
		agentId: string,
		surface: ChatSurfaceName,
		token: string,
	): Promise<{ session: string; invite: ChatPageInvite } | InviteFailure> {
		const invites = await this.list(agentId, surface);
		const invite = invites.find((entry) => entry.tokenHash === sha256(token));
		if (!invite) return 'invite_invalid';
		const state = this.state(invite);
		if (typeof state === 'string') return state;
		invite.uses += 1;
		invite.lastUsedAt = new Date().toISOString();
		await this.save(agentId, surface, invites);
		const session = randomBytes(32).toString('base64url');
		await this.settingsRepository.upsertByKey(
			`agentChatSession.${sha256(session)}`,
			JSON.stringify({
				scope: scopeOf(agentId, surface),
				inviteId: invite.id,
				issuedAt: Date.now(),
			}),
			false,
			{},
		);
		return { session, invite };
	}

	/** The principal of a session, checked against the invite on every request (revoke and expiry apply at once). */
	async sessionUser(
		agentId: string,
		surface: ChatSurfaceName,
		session: string,
		notBefore = 0,
	): Promise<ChatPageUser | undefined> {
		const row = await this.settingsRepository.findByKey(`agentChatSession.${sha256(session)}`);
		if (!row) return undefined;
		const entry = JSON.parse(row.value) as { scope: string; inviteId: string; issuedAt?: number };
		if (entry.scope !== scopeOf(agentId, surface) || (entry.issuedAt ?? 0) <= notBefore)
			return undefined;
		const invite = (await this.list(agentId, surface)).find(
			(candidate) => candidate.id === entry.inviteId,
		);
		if (!invite || typeof this.state(invite) === 'string') return undefined;
		return { key: `invite-${invite.id}`, kind: 'invite', name: invite.label };
	}

	async endSession(session: string) {
		await this.settingsRepository.delete({ key: `agentChatSession.${sha256(session)}` });
	}

	private state(invite: ChatPageInvite): ChatPageInvite | InviteFailure {
		if (invite.revokedAt) return 'invite_revoked';
		if (Date.parse(invite.expiresAt) <= Date.now()) return 'invite_expired';
		return invite;
	}

	private async save(agentId: string, surface: ChatSurfaceName, invites: ChatPageInvite[]) {
		await this.settingsRepository.upsertByKey(
			`agentChatInvites.${scopeOf(agentId, surface)}`,
			JSON.stringify(invites),
			false,
			{},
		);
	}
}
