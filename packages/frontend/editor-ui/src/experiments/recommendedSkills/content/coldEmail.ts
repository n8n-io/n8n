import { parseSkillMarkdown } from '@/features/agents/composables/useAgentSkillImport';
import type { AgentSkill } from '@/features/agents/types';

import followUpSequences from './cold-email/references/follow-up-sequences.md?raw';
import frameworks from './cold-email/references/frameworks.md?raw';
import personalization from './cold-email/references/personalization.md?raw';
import subjectLines from './cold-email/references/subject-lines.md?raw';
import skillMarkdown from './cold-email/SKILL.md?raw';

export const coldEmailSkill: AgentSkill = {
	...parseSkillMarkdown(skillMarkdown),
	references: [
		{ path: 'references/personalization.md', content: personalization },
		{ path: 'references/frameworks.md', content: frameworks },
		{ path: 'references/subject-lines.md', content: subjectLines },
		{ path: 'references/follow-up-sequences.md', content: followUpSequences },
	],
};
