import { parseSkillMarkdown } from '@/features/agents/composables/useAgentSkillImport';

import skillMarkdown from './research/SKILL.md?raw';

export const researchSkill = parseSkillMarkdown(skillMarkdown);
