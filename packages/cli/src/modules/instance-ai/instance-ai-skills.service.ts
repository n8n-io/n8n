import { filterRuntimeSkillSource, type RuntimeSkillSource } from '@n8n/agents';
import { Service } from '@n8n/di';
import {
	loadInstanceAiPromptSkills,
	loadInstanceAiSkills,
	type PromptProfile,
} from '@n8n/instance-ai';
import { UnexpectedError } from 'n8n-workflow';

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

export interface InstanceAiRunSkills {
	/** The skills that the run can load. */
	source: RuntimeSkillSource;
	/** Tools that the prompt profile turns off. */
	disabledTools: string[];
}

/**
 * Skills gated by the `088_config_evaluations` flag. The playbook is a
 * `workflow-builder` reference next to `config-evals`, not inside it, so the
 * flag must hide it separately.
 */
const CONFIG_EVALS_SKILL_IDS = ['config-evals', 'config-eval-playbook'];

/**
 * Skill gated by the instance-context reader. It is entirely about a block and a tool
 * that only exist when the reader is on, so listing it otherwise would advertise both.
 */
const INSTANCE_AWARENESS_SKILL_ID = 'instance-awareness';

/** Skills that only work when the Assistant can build agents. */
const AGENT_BUILDING_SKILL_IDS = ['agent-builder', 'intent-recognition'];

/** Skill sent with the opening turn of an onboarding thread. */
const ONBOARDING_SKILL_ID = 'suggest-automations';

/** Resolves the skills that Instance AI can load. Skill ids are folder ids under `@n8n/instance-ai/skills`. */
@Service()
export class InstanceAiSkillsService {
	/** The skills of the prompt profile, without the skills that `flags` turn off. */
	async resolveForRun(
		profile: PromptProfile,
		flags: InstanceAiSkillFlags,
	): Promise<InstanceAiRunSkills> {
		const { source, disabledTools } = await loadInstanceAiPromptSkills(profile);
		const disabledSkillIds = this.disabledSkillIds(flags);
		return {
			source:
				disabledSkillIds.length > 0 ? filterRuntimeSkillSource(source, disabledSkillIds) : source,
			disabledTools,
		};
	}

	/** The instructions of the onboarding skill. */
	async loadOnboardingInstructions(): Promise<string> {
		const skill = await loadInstanceAiSkills().loadSkill(ONBOARDING_SKILL_ID);
		if (!skill) throw new UnexpectedError(`Skill "${ONBOARDING_SKILL_ID}" is missing`);
		return skill.instructions;
	}

	private disabledSkillIds(flags: InstanceAiSkillFlags): string[] {
		const disabled: string[] = [];
		if (!flags.configEvalsEnabled) disabled.push(...CONFIG_EVALS_SKILL_IDS);
		if (!flags.instanceContextEnabled) disabled.push(INSTANCE_AWARENESS_SKILL_ID);
		if (!flags.agentBuildingEnabled) disabled.push(...AGENT_BUILDING_SKILL_IDS);
		return disabled;
	}
}
