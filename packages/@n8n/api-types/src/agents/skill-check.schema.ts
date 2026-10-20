import { z } from 'zod';

import { AGENT_SKILL_NAME_MAX_LENGTH, agentSkillSchema } from './agent-skill.schema';
import { skillScopeSchema } from './skills.schema';
import { Z } from '../zod-class';

/** The result of the security check for one piece of skill content. */
export type SkillCheckLevel = 'passed' | 'review' | 'blocked';

export type SkillCheckFinding = {
	/** "blocked" stops the skill. "review" needs a person to confirm. */
	level: 'review' | 'blocked';
	code:
		| 'hidden_characters'
		| 'invalid_skill'
		| 'too_large'
		| 'suspicious_instructions'
		| 'possible_secret'
		| 'external_links'
		| 'files_not_imported';
	message: string;
	/** Short evidence, for example a line number or the list of domains. */
	detail?: string;
	/** The file the finding is about, relative to the skill folder. */
	file?: string;
};

export type SkillCheckResult = {
	result: SkillCheckLevel;
	findings: SkillCheckFinding[];
};

/** A file in the skill folder that n8n does not import. */
export type SkillSkippedFile = { path: string; reason: string };

/** Skill content that comes from outside this instance, such as a share link. */
const externalSkillSchema = agentSkillSchema
	.omit({ allowedTools: true })
	.extend({ name: z.string().trim().min(1).max(AGENT_SKILL_NAME_MAX_LENGTH) });

/** Runs the security check on skill content. Nothing is stored. */
export class CheckSkillContentDto extends Z.class({
	skill: externalSkillSchema,
}) {}

/**
 * Adds a skill that someone shared from another instance. The server runs the security
 * check again: "blocked" is refused, and "review" needs `acknowledgeWarnings`.
 */
export class ImportSharedSkillDto extends Z.class({
	scope: skillScopeSchema,
	/** Required for a project skill, absent otherwise. */
	projectId: z.string().max(36).optional(),
	/** Required for an agent skill, absent otherwise. */
	agentId: z.string().max(36).optional(),
	skill: externalSkillSchema,
	acknowledgeWarnings: z.boolean().optional(),
}) {}
