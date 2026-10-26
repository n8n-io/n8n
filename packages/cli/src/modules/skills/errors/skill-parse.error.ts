import { UserError } from '@n8n/errors';

/** A skill folder that n8n cannot read as a skill, for example a SKILL.md without frontmatter. */
export class SkillParseError extends UserError {}
