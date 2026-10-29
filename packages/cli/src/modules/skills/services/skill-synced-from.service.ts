import type { SkillSyncedFrom } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { OperationContext, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import { SkillSourceRepository } from '../database/repositories/skill-source.repository';
import { SkillSourceClientRegistry } from '../sources/skill-source-client-registry.service';
import { SkillAccessService } from './skill-access.service';
import { SkillSyncFlagGate } from './skill-sync-flag-gate';

/** Where a synced skill comes from, for the "Synced from" banner of the skill modal. */
@Service()
export class SkillSyncedFromService {
	constructor(
		private readonly logger: Logger,
		private readonly sourceRepository: SkillSourceRepository,
		private readonly clients: SkillSourceClientRegistry,
		private readonly skillAccess: SkillAccessService,
		private readonly skillSyncFlagGate: SkillSyncFlagGate,
	) {}

	/** Null for a skill without a source, or a source whose type has no client on this build. */
	async of(
		user: User,
		skillId: string,
		ctx: OperationContext = {},
	): Promise<SkillSyncedFrom | null> {
		const source = await this.sourceRepository.findSyncedFrom(skillId, ctx);
		const client = source && this.clients.get(source.type);
		if (!source || !client) return null;
		// The route answers 404 while the Skill Sync flag is off for the user.
		const canStopSyncing =
			(await this.skillSyncFlagGate.isEnabled(user)) &&
			(await this.skillAccess.canOnSource(user, source, 'stopSyncing'));
		try {
			return {
				sourceId: source.sourceId,
				type: source.type,
				label: client.describe(source.locator).label,
				webUrl: client.webUrl(source.locator, source.remoteRef),
				canStopSyncing,
			};
		} catch (error) {
			// A stored locator that the client cannot read must not break the skill modal.
			this.logger.warn('Could not describe the source of a synced skill', {
				skillId,
				error: ensureError(error).message,
			});
			return null;
		}
	}
}
