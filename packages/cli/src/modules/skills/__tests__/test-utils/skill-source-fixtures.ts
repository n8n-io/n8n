// Fixtures for tests of synced skills: a source and the link that makes a skill synced.
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import { SkillSourceLink } from '../../database/entities/skill-source-link.entity';
import { SkillSourceRepository } from '../../database/repositories/skill-source.repository';

/** Makes the skill a synced skill of a new GitHub source in its scope. Answers the source id. */
export async function linkSkill(
	skillId: string,
	scope: { projectId: string | null; createdById: string },
	pending: { pendingContentHash?: string } = {},
): Promise<string> {
	const sourceId = randomUUID();
	await Container.get(SkillSourceRepository).insertConnected({
		id: sourceId,
		type: 'github',
		locator: { owner: 'acme', repository: `skills-${sourceId}`, branch: 'main', path: '' },
		identityKey: `github:github.com/acme/skills-${sourceId}`,
		projectId: scope.projectId,
		credentialId: null,
		createdById: scope.createdById,
	});
	await Container.get(SkillSourceRepository).insertImported({
		skillId,
		sourceId,
		remoteRef: { path: `skills/${skillId}` },
		baseRevision: 'a'.repeat(40),
		baseContentHash: 'hash',
		skippedFiles: [],
	});
	if (pending.pendingContentHash) {
		// No write path sets a pending update yet: the check task of P2 adds it.
		await Container.get(DataSource).manager.update(
			SkillSourceLink,
			{ skillId },
			{ pendingContentHash: pending.pendingContentHash, state: 'update_available' },
		);
	}
	return sourceId;
}
