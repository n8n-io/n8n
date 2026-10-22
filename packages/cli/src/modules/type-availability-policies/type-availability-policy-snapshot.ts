import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { OnPubSubEvent, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { latestWins } from '@n8n/utils/promise/latest-wins';

import { Publisher } from '@/scaling/pubsub/publisher.service';

import { TypeAvailabilityPolicyAttachmentRepository } from './database/repositories/type-availability-policy-attachment.repository';
import {
	TypeAvailabilityPolicyScopeRepository,
	type ScopeFingerprint,
} from './database/repositories/type-availability-policy-scope.repository';
import {
	toEffectivePolicy,
	unconfiguredScope,
	type EffectivePolicy,
	type ProjectEffectivePolicy,
} from './effective-policy';

/** How often a process checks for a policy write whose reload message it never received. */
export const FINGERPRINT_POLL_INTERVAL_MS = 30 * Time.seconds.toMilliseconds;

type Loaded = {
	readonly scopes: ReadonlyMap<string, EffectivePolicy>;
	readonly fingerprint: ScopeFingerprint;
};

function scopeKey(kind: string, projectId: string | null): string {
	return `${kind}:${projectId ?? 'instance'}`;
}

function sameFingerprint(a: ScopeFingerprint, b: ScopeFingerprint): boolean {
	return (
		a.count === b.count && a.versionSum === b.versionSum && a.newestCreatedAt === b.newestCreatedAt
	);
}

/**
 * Every configured policy scope, held in memory so an enforcement read does no I/O and cannot
 * lose a race against its deadline. The database stays the source of truth.
 *
 * Kept fresh three ways: the writing process reloads after its commit, the others reload on a
 * pubsub command, and a fingerprint poll catches a command that was lost.
 */
@Service()
export class TypeAvailabilityPolicySnapshot {
	private loaded: Loaded | null = null;

	private pollTimer: NodeJS.Timeout | undefined;

	private polling = false;

	constructor(
		private readonly scopeRepository: TypeAvailabilityPolicyScopeRepository,
		private readonly attachmentRepository: TypeAvailabilityPolicyAttachmentRepository,
		private readonly publisher: Publisher,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('policy');
	}

	/** `null` until the first load succeeds, so the caller reads the database instead. */
	read(kind: string, projectId: string | null): EffectivePolicy | null {
		if (!this.loaded) return null;

		return this.loaded.scopes.get(scopeKey(kind, projectId)) ?? unconfiguredScope(kind, projectId);
	}

	/** Every configured project scope of `kind`, or `null` until the first load succeeds. */
	projectScopes(kind: string): ProjectEffectivePolicy[] | null {
		if (!this.loaded) return null;

		return [...this.loaded.scopes.values()].filter(
			(scope): scope is ProjectEffectivePolicy => scope.kind === kind && scope.projectId !== null,
		);
	}

	/** A failed first load does not stop the boot: reads use the database and the poll retries. */
	async start(): Promise<void> {
		await this.reloadAndLog();

		this.pollTimer ??= setInterval(async () => await this.poll(), FINGERPRINT_POLL_INTERVAL_MS);
		this.pollTimer.unref();
	}

	@OnShutdown()
	stop(): void {
		clearInterval(this.pollTimer);
		this.pollTimer = undefined;
	}

	/** Call after a policy write commits, never inside its transaction. */
	async refreshAfterWrite(): Promise<void> {
		await this.reloadAndLog();

		// Not awaited: a disconnected Redis queues the publish, and the write already committed.
		void this.publisher
			.publishCommand({ command: 'reload-type-availability-policies' })
			.catch((error: unknown) => {
				this.logger.warn('Failed to tell other processes to reload type availability policies', {
					error,
				});
			});
	}

	@OnPubSubEvent('reload-type-availability-policies')
	@OnPubSubEvent('pubsub-reconnected')
	async handleReloadRequest(): Promise<void> {
		await this.reloadAndLog();
	}

	/** Rejects when the load fails. The snapshot then keeps what it had. */
	readonly reload = latestWins(async () => await this.load());

	private async reloadAndLog(): Promise<void> {
		try {
			await this.reload();
		} catch (error) {
			this.logger.error('Failed to load type availability policies', { error });
		}
	}

	private async load(): Promise<void> {
		// Read first: a write that lands during the load then shows as a change on the next poll.
		const fingerprint = await this.scopeRepository.readFingerprint({});
		const scopes = await this.scopeRepository.findAllScopes({});
		const attachmentsByScope = await this.attachmentRepository.listAttachmentsForScopes(
			scopes.map((scope) => scope.id),
			{},
		);

		const byKey = new Map<string, EffectivePolicy>();
		for (const scope of scopes) {
			byKey.set(
				scopeKey(scope.kind, scope.projectId),
				toEffectivePolicy(scope, attachmentsByScope.get(scope.id) ?? []),
			);
		}

		this.loaded = { scopes: byKey, fingerprint };
	}

	private async poll(): Promise<void> {
		if (this.polling) return;
		this.polling = true;

		try {
			if (this.loaded) {
				const fingerprint = await this.scopeRepository.readFingerprint({});
				if (sameFingerprint(fingerprint, this.loaded.fingerprint)) return;

				this.logger.info('Type availability policies changed without a reload message');
			}

			await this.reload();
		} catch (error) {
			this.logger.error('Failed to check type availability policies for changes', { error });
		} finally {
			this.polling = false;
		}
	}
}
