import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ForbiddenError, NotFoundError } from '@n8n/errors';

import { SkillSourceRepository } from '../database/repositories/skill-source.repository';
import { SkillAccessService } from './skill-access.service';
import { SkillSyncFlagGate } from './skill-sync-flag-gate';
import { SkillsTelemetry } from './skills-telemetry.service';

/**
 * What happens to synced skills after the import: stop syncing now, and the checks and the
 * review of updates later. Every write goes through the link of the skill, never the skill.
 */
@Service()
export class SkillSyncService {
	constructor(
		private readonly flagGate: SkillSyncFlagGate,
		private readonly skillAccess: SkillAccessService,
		private readonly sourceRepository: SkillSourceRepository,
		private readonly skillsTelemetry: SkillsTelemetry,
	) {}

	/**
	 * Turns a synced skill into a normal skill that n8n can edit and move on its own. It keeps
	 * all its versions, and an update that waited for review is dropped. It cannot be undone:
	 * the skill does not sync again. `skill.source` keeps its value, as it records how the
	 * skill was created.
	 */
	async stopSyncing(user: User, skillId: string): Promise<void> {
		await this.flagGate.assertEnabled(user);
		// 404 for a skill the user cannot read, so the answer reveals nothing about it.
		await this.skillAccess.requireAccess(user, skillId, 'read');
		const link = await this.sourceRepository.findLinkBySkillId(skillId);
		const source = link && (await this.sourceRepository.findById(link.sourceId));
		if (!link || !source) throw new NotFoundError('This skill is not synced.');
		if (!(await this.skillAccess.canOnSource(user, source, 'stopSyncing'))) {
			throw new ForbiddenError('You are not allowed to change the skills of this source.');
		}
		// A stop at the same time removed the link first. The skill is not synced either way.
		if (!(await this.sourceRepository.deleteLink(skillId))) return;
		await this.skillsTelemetry.stoppedSync(
			{ provider: source.type, had_pending_update: link.pendingContentHash !== null },
			user.id,
		);
	}
}
