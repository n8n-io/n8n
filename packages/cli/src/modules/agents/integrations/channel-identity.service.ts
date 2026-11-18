import { Logger } from '@n8n/backend-common';
import { PersonRepository, SettingsRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';

/** A user of a chat platform: the platform, its workspace or tenant, and the user in it. */
export interface ChannelActor {
	platform: string;
	tenantId: string;
	externalUserId: string;
}

/** How a chat user was linked to an n8n user. */
export type ChannelLinkMethod = 'email' | 'explicit';

export interface ChannelIdentityLink {
	userId: string;
	linkedAt: string;
	method: ChannelLinkMethod;
}

export interface ResolveChannelIdentityOptions {
	/** Link by a confirmed email when no link exists yet. */
	emailLinking: boolean;
	/** Read the email of the chat user from the platform. Called only for email linking. */
	lookupEmail: () => Promise<{ email: string; confirmed: boolean } | undefined>;
}

const KEY_PREFIX = 'agents.channelIdentity';

function isLink(value: unknown): value is ChannelIdentityLink {
	return (
		isRecord(value) &&
		typeof value.userId === 'string' &&
		typeof value.linkedAt === 'string' &&
		(value.method === 'email' || value.method === 'explicit')
	);
}

/**
 * Maps a user of a chat platform to an n8n user. It works for any platform: a
 * link is keyed by the platform, the tenant and the external user id.
 *
 * Links are key-value rows in the settings table, behind this service, so a
 * later move to a dedicated table touches only this file. The service does not
 * use `auth_identity`: a row there that is not `email` changes whether an
 * account counts as pending.
 */
@Service()
export class ChannelIdentityService {
	constructor(
		private readonly logger: Logger,
		private readonly settingsRepository: SettingsRepository,
		private readonly personRepository: PersonRepository,
	) {}

	/**
	 * The n8n user for a chat user, or `null` when there is none or the account
	 * cannot act: disabled, or an invite that nobody accepted.
	 */
	async resolve(actor: ChannelActor, options: ResolveChannelIdentityOptions): Promise<User | null> {
		const stored = await this.readLink(actor);
		if (stored) {
			const person = await this.personRepository.findByIdWithRole(stored.userId);
			return person && !person.disabled ? person : null;
		}
		if (!options.emailLinking) return null;
		return await this.linkByEmail(actor, options.lookupEmail);
	}

	/** Store a link that the user confirmed. A later link for the same chat user replaces the first. */
	async link(actor: ChannelActor, userId: string, method: ChannelLinkMethod): Promise<void> {
		const link: ChannelIdentityLink = { userId, linkedAt: new Date().toISOString(), method };
		await this.settingsRepository.upsertByKey(this.keyOf(actor), JSON.stringify(link), false, {});
	}

	private async linkByEmail(
		actor: ChannelActor,
		lookupEmail: ResolveChannelIdentityOptions['lookupEmail'],
	): Promise<User | null> {
		let found: Awaited<ReturnType<typeof lookupEmail>>;
		try {
			found = await lookupEmail();
		} catch (error) {
			this.logger.warn('Could not read the email of a chat user', {
				platform: actor.platform,
				error: error instanceof Error ? error.message : String(error),
			});
			return null;
		}
		// An email that the platform does not confirm proves nothing about its owner.
		if (!found?.confirmed) return null;

		const person = await this.personRepository.findByEmailWithAuthIdentities(
			found.email.trim().toLowerCase(),
		);
		if (!person || person.disabled || person.isPending) return null;

		await this.link(actor, person.id, 'email');
		return person;
	}

	private async readLink(actor: ChannelActor): Promise<ChannelIdentityLink | null> {
		const row = await this.settingsRepository.findByKey(this.keyOf(actor));
		if (!row) return null;
		try {
			const value: unknown = JSON.parse(row.value);
			return isLink(value) ? value : null;
		} catch {
			return null;
		}
	}

	private keyOf({ platform, tenantId, externalUserId }: ChannelActor): string {
		return [KEY_PREFIX, platform, tenantId, externalUserId].map(encodeURIComponent).join('.');
	}
}
