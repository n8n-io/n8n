import type { RuntimeSkill, RuntimeSkillSource } from '@n8n/agents';
import { createRuntimeSkillSource, mergeRuntimeSkillSources } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { createHash } from 'node:crypto';

import { linkedFilesForSkill } from './json-config/from-json-config';
import { SkillHubRepository } from './repositories/skill-hub.repository';
import { toAgentSkill } from './skills-hub/skill-hub.service';

/**
 * The skills-hub skills the n8n Assistant runs for one user: the instance's skills
 * and the user's own "Just you" skills, each at its latest saved version. Project
 * skills stay with the agents of their project.
 */
@Service()
export class InstanceAiHubSkillsAdapterService {
	constructor(
		private readonly logger: Logger,
		private readonly skillHubRepository: SkillHubRepository,
	) {}

	/**
	 * Adds the user's hub skills to the built-in source, so one `load_skill` tool serves
	 * both. A hub skill whose name reads the same as a built-in skill, or as an earlier
	 * hub skill, is left out: the runtime registry rejects two skills with one name, and
	 * the built-in set must keep working.
	 */
	async extendSource(user: User, builtIn: RuntimeSkillSource): Promise<RuntimeSkillSource> {
		const skills = await this.skillHubRepository.findVisibleSkills({
			userId: user.id,
			allUsers: false,
			projectIds: [],
		});
		if (skills.length === 0) return builtIn;

		const rows = await this.skillHubRepository.findLatestSavedVersions(
			skills.map((skill) => skill.id),
		);
		const takenNames = new Set(builtIn.registry.skills.map((skill) => skill.name.toLowerCase()));
		const runtimeSkills: RuntimeSkill[] = [];
		const referencesBySkillId = new Map<string, Map<string, string>>();

		for (const [skillId, row] of rows) {
			const skill = toAgentSkill(row);
			const normalizedName = skill.name.toLowerCase();
			if (takenNames.has(normalizedName)) {
				this.logger.debug('Skipped a hub skill whose name the assistant already uses', {
					skillId,
					userId: user.id,
				});
				continue;
			}
			takenNames.add(normalizedName);
			referencesBySkillId.set(
				skillId,
				new Map((skill.references ?? []).map((reference) => [reference.path, reference.content])),
			);
			runtimeSkills.push({
				id: skillId,
				name: skill.name,
				description: skill.description,
				instructions: skill.instructions,
				// The workspace copy of a skill lives in a folder named after this. Ids are
				// safe path segments; names are free text.
				sourceDirectory: `hub/${skillId}`,
				...(skill.allowedTools ? { allowedTools: skill.allowedTools } : {}),
				linkedFiles: linkedFilesForSkill(skill),
			});
		}
		if (runtimeSkills.length === 0) return builtIn;

		const hub: RuntimeSkillSource = {
			...createRuntimeSkillSource(runtimeSkills),
			loadFile: async (skillId, filePath) => {
				const content = referencesBySkillId.get(skillId)?.get(filePath);
				if (content === undefined) return await Promise.resolve(null);
				return await Promise.resolve({
					skillId,
					filePath,
					content,
					bytes: Buffer.byteLength(content, 'utf8'),
					sha256: createHash('sha256').update(content).digest('hex'),
				});
			},
		};
		return mergeRuntimeSkillSources([builtIn, hub]);
	}
}
