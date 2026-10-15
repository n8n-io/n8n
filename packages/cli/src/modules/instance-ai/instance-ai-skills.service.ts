import {
	filterRuntimeSkillSource,
	type RuntimeSkillContent,
	type RuntimeSkillSource,
} from '@n8n/agents';
import { Service } from '@n8n/di';
import { loadInstanceAiPromptSkills, type PromptProfile } from '@n8n/instance-ai';
import { UnexpectedError } from 'n8n-workflow';

/** Folder ids under `@n8n/instance-ai/skills` that n8n refers to by id. */
export const SKILLS = {
	configEvals: 'config-evals',
	configEvalPlaybook: 'config-eval-playbook',
	instanceAwareness: 'instance-awareness',
	agentBuilder: 'agent-builder',
	intentRecognition: 'intent-recognition',
	suggestAutomations: 'suggest-automations',
} as const;

export type SkillId = (typeof SKILLS)[keyof typeof SKILLS];

/** Feature flags that turn skills on or off for a user. */
export interface InstanceAiSkillFlags {
	configEvalsEnabled: boolean;
	instanceContextEnabled: boolean;
	/**
	 * Whether the host gives the Assistant a builder delegate, so it can build
	 * agents. This needs the Agents module and the Settings > Agents switch.
	 */
	agentBuildingEnabled: boolean;
}

/** What decides the active skills of a run. */
export interface InstanceAiSkillScope {
	profile: PromptProfile;
	flags: InstanceAiSkillFlags;
}

export interface InstanceAiRunSkills {
	/** The active skills, which the run can load. */
	source: RuntimeSkillSource;
	/** Tools that the prompt profile turns off. */
	disabledTools: string[];
}

/** The skills that each flag turns on. A skill that no flag lists is always active. */
const SKILL_GATES: ReadonlyArray<{ flag: keyof InstanceAiSkillFlags; skills: SkillId[] }> = [
	// The playbook is a `workflow-builder` reference next to `config-evals`, not
	// inside it, so the flag must hide it separately.
	{ flag: 'configEvalsEnabled', skills: [SKILLS.configEvals, SKILLS.configEvalPlaybook] },
	// The skill is about a block and a tool that only exist when the reader is on.
	{ flag: 'instanceContextEnabled', skills: [SKILLS.instanceAwareness] },
	{ flag: 'agentBuildingEnabled', skills: [SKILLS.agentBuilder, SKILLS.intentRecognition] },
];

/** Loads the active skills of Instance AI: the prompt-profile skills that the flags leave on. */
@Service()
export class InstanceAiSkillsService {
	/** The active skills, and the tools that the prompt profile turns off. */
	async loadSkills({ profile, flags }: InstanceAiSkillScope): Promise<InstanceAiRunSkills> {
		const { source, disabledTools } = await loadInstanceAiPromptSkills(profile);
		const inactive = inactiveSkillIds(flags);

		return {
			source: inactive.length > 0 ? filterRuntimeSkillSource(source, inactive) : source,
			disabledTools,
		};
	}

	/** One active skill, or `null` when the skill is not active. */
	async retrieveSkill(
		skillId: SkillId,
		scope: InstanceAiSkillScope,
	): Promise<RuntimeSkillContent | null> {
		const { source } = await this.loadSkills(scope);

		return await source.loadSkill(skillId);
	}

	/** One active skill. Throws when the skill is not active. */
	async loadSkill(skillId: SkillId, scope: InstanceAiSkillScope): Promise<RuntimeSkillContent> {
		const skill = await this.retrieveSkill(skillId, scope);
		if (!skill) throw new UnexpectedError(`Skill "${skillId}" is not active`);

		return skill;
	}
}

function inactiveSkillIds(flags: InstanceAiSkillFlags): SkillId[] {
	return SKILL_GATES.flatMap(({ flag, skills }) => (flags[flag] ? [] : skills));
}
