import type { IconName } from '@n8n/design-system';
import type { BaseTextKey } from '@n8n/i18n';

import type { AgentSkill } from '@/features/agents/types';

export type RecommendedSkillId = 'humanizer' | 'cold-email' | 'research';

/** The upstream project that a recommended skill is based on. */
export interface RecommendedSkillSource {
	label: string;
	url: string;
}

export interface RecommendedSkill {
	id: RecommendedSkillId;
	name: string;
	icon: IconName;
	cardTextKey: BaseTextKey;
	source: RecommendedSkillSource;
	load: () => Promise<AgentSkill>;
}

export interface RecommendedSkillSelection {
	id: RecommendedSkillId;
	skill: AgentSkill;
}

export const RECOMMENDED_SKILLS: readonly RecommendedSkill[] = [
	{
		id: 'humanizer',
		name: 'humanizer',
		icon: 'pen',
		cardTextKey: 'experiments.recommendedSkills.humanizer.cardText',
		source: {
			label: 'blader/humanizer',
			url: 'https://github.com/blader/humanizer',
		},
		load: async () => (await import('./content/humanizer')).humanizerSkill,
	},
	{
		id: 'cold-email',
		name: 'cold-email',
		icon: 'mail',
		cardTextKey: 'experiments.recommendedSkills.coldEmail.cardText',
		source: {
			label: 'coreyhaines31/marketingskills',
			url: 'https://github.com/coreyhaines31/marketingskills/tree/main/skills/cold-email',
		},
		load: async () => (await import('./content/coldEmail')).coldEmailSkill,
	},
	{
		id: 'research',
		name: 'research',
		icon: 'search',
		cardTextKey: 'experiments.recommendedSkills.research.cardText',
		source: {
			label: 'mattpocock/skills',
			url: 'https://github.com/mattpocock/skills/tree/main/skills/engineering/research',
		},
		load: async () => (await import('./content/research')).researchSkill,
	},
];
