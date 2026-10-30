import { filterRuntimeSkillSource, type RuntimeSkillContent } from '@n8n/agents';
import { Service } from '@n8n/di';
import { loadInstanceAiPromptSkills, type PromptProfile } from '@n8n/instance-ai';
import { UnexpectedError } from 'n8n-workflow';

import {
	type AssistantSkillContent,
	type AssistantSkillContext,
	type AssistantSkillFileContent,
	AssistantSkillsFlagGate,
	type AssistantSkillSummary,
	SkillRuntimeService,
} from '@/modules/skills';

import {
	loadHubRunSkills,
	type AssistantSkillReader,
	type HubRunSkills,
} from './instance-ai-hub-skills';

import type { InstanceAiFeatureFlags } from './instance-ai.adapter.service';

/** Folder ids under `@n8n/instance-ai/skills` that n8n refers to by id. */
export const SKILLS = {
	configEvals: 'config-evals',
	configEvalPlaybook: 'config-eval-playbook',
	instanceAwareness: 'instance-awareness',
	agentBuilder: 'agent-builder',
	intentRecognition: 'intent-recognition',
	suggestAutomations: 'suggest-automations',
	appBuilder: 'app-builder',
} as const;

export type SkillId = (typeof SKILLS)[keyof typeof SKILLS];

/** What decides the active skills of a run. */
export interface InstanceAiSkillScope {
	profile: PromptProfile;
	flags: Pick<InstanceAiFeatureFlags, 'configEvalsEnabled' | 'instanceContextEnabled'>;
	/**
	 * Whether the host gives the Assistant a builder delegate, so it can build
	 * agents. This needs the Agents module and the Settings > Agents switch.
	 */
	agentBuildingEnabled: boolean;
	appBuildingEnabled: boolean;
}

export interface InstanceAiRunSkills extends HubRunSkills {
	/** Tools that the prompt profile turns off. */
	disabledTools: string[];
}

/** The gated skills, and when each gate is open. A skill that no gate lists is always active. */
const SKILL_GATES: ReadonlyArray<{
	skills: SkillId[];
	isOpen: (scope: InstanceAiSkillScope) => boolean;
}> = [
	{
		// The playbook is a `workflow-builder` reference next to `config-evals`, not
		// inside it, so the flag must hide it separately.
		skills: [SKILLS.configEvals, SKILLS.configEvalPlaybook],
		isOpen: ({ flags }) => flags.configEvalsEnabled,
	},
	{
		// The skill is about a block and a tool that only exist when the reader is on.
		skills: [SKILLS.instanceAwareness],
		isOpen: ({ flags }) => flags.instanceContextEnabled,
	},
	{
		skills: [SKILLS.agentBuilder, SKILLS.intentRecognition],
		isOpen: ({ agentBuildingEnabled }) => agentBuildingEnabled,
	},
	{
		skills: [SKILLS.appBuilder],
		isOpen: ({ appBuildingEnabled }) => appBuildingEnabled,
	},
];

/** Loads the active skills of Instance AI: the prompt-profile skills that the gates leave on. */
@Service()
export class InstanceAiSkillsService implements AssistantSkillReader {
	constructor(
		private readonly assistantSkillsGate: AssistantSkillsFlagGate,
		private readonly skillRuntime: SkillRuntimeService,
	) {}

	async isEnabled(): Promise<boolean> {
		return await this.assistantSkillsGate.isEnabled();
	}

	async listSkills(context: AssistantSkillContext): Promise<AssistantSkillSummary[]> {
		if (!(await this.isEnabled())) return [];
		return await this.skillRuntime.listForAssistant(context);
	}

	async readSkill(
		context: AssistantSkillContext,
		skillId: string,
		versionId?: string,
	): Promise<AssistantSkillContent | null> {
		if (!(await this.isEnabled())) return null;
		return await this.skillRuntime.readForAssistant(context, skillId, versionId);
	}

	async readFile(
		context: AssistantSkillContext,
		skillId: string,
		versionId: string,
		path: string,
	): Promise<AssistantSkillFileContent | null> {
		if (!(await this.isEnabled())) return null;
		return await this.skillRuntime.readFileForAssistant(context, skillId, versionId, path);
	}

	/** The active skills, and the tools that the prompt profile turns off. */
	async loadSkills(
		scope: InstanceAiSkillScope,
		context?: AssistantSkillContext,
	): Promise<InstanceAiRunSkills> {
		const { source, disabledTools } = await loadInstanceAiPromptSkills(scope.profile);
		const inactive = inactiveSkillIds(scope);

		const builtIns = inactive.length > 0 ? filterRuntimeSkillSource(source, inactive) : source;
		const skills = context ? await loadHubRunSkills(builtIns, this, context) : { source: builtIns };

		return { ...skills, disabledTools };
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

function inactiveSkillIds(scope: InstanceAiSkillScope): SkillId[] {
	return SKILL_GATES.flatMap(({ skills, isOpen }) => (isOpen(scope) ? [] : skills));
}
