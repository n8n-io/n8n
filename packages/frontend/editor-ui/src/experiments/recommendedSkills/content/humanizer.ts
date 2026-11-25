import { parseSkillMarkdown } from '@/features/agents/composables/useAgentSkillImport';

import skillMarkdown from './humanizer/SKILL.md?raw';

export const humanizerSkill = parseSkillMarkdown(skillMarkdown);
