import type { SkillSyncedFrom } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import { SkillSourceRepository } from '../database/repositories/skill-source.repository';
import { SkillSourceClientRegistry } from '../sources/skill-source-client-registry.service';

/** Where a synced skill comes from, for the "Synced from" banner of the skill modal. */
@Service()
export class SkillSyncedFromService {
	constructor(
		private readonly logger: Logger,
		private readonly sourceRepository: SkillSourceRepository,
		private readonly clients: SkillSourceClientRegistry,
	) {}

	/** Null for a skill without a source, or a source whose type has no client on this build. */
	async of(skillId: string, ctx: OperationContext = {}): Promise<SkillSyncedFrom | null> {
		const source = await this.sourceRepository.findSyncedFrom(skillId, ctx);
		const client = source && this.clients.get(source.type);
		if (!source || !client) return null;
		try {
			return {
				sourceId: source.sourceId,
				type: source.type,
				label: client.describe(source.locator).label,
				webUrl: client.webUrl(source.locator, source.remoteRef),
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
