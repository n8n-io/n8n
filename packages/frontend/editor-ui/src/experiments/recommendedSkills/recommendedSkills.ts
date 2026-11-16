import type { IconName } from '@n8n/design-system';
import type { BaseTextKey } from '@n8n/i18n';

import type { AgentSkill } from '@/features/agents/types';

export type RecommendedSkillId = 'humanizer' | 'cold-email' | 'research';

export interface RecommendedSkill {
	id: RecommendedSkillId;
	name: string;
	icon: IconName;
	cardTextKey: BaseTextKey;
	load: () => Promise<AgentSkill>;
}

export const RECOMMENDED_SKILLS: readonly RecommendedSkill[] = [
	{
		id: 'humanizer',
		name: 'humanizer',
		icon: 'pen',
		cardTextKey: 'experiments.recommendedSkills.humanizer.cardText',
		load: async () => (await import('./content/humanizer')).humanizerSkill,
	},
	{
		id: 'cold-email',
		name: 'cold-email',
		icon: 'mail',
		cardTextKey: 'experiments.recommendedSkills.coldEmail.cardText',
		load: async () => (await import('./content/coldEmail')).coldEmailSkill,
	},
	{
		id: 'research',
		name: 'research',
		icon: 'search',
		cardTextKey: 'experiments.recommendedSkills.research.cardText',
		load: async () => (await import('./content/research')).researchSkill,
	},
];
