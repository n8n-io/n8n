import { filterRuntimeSkillSource, type RuntimeSkillSource } from '@n8n/agents';
import { Service } from '@n8n/di';
import {
	disabledInstanceAiSkillIds,
	loadInstanceAiPromptSkills,
	type InstanceAiSkillFlags,
	type PromptProfile,
} from '@n8n/instance-ai';

export interface InstanceAiRunSkills {
	/** The skills that the run can load. */
	source: RuntimeSkillSource;
	/** Tools that the prompt profile turns off. */
	disabledTools: string[];
}

/** Resolves the runtime skills that an Instance AI run can load. */
@Service()
export class InstanceAiSkillsService {
	/** The skills of the prompt profile, without the skills that `flags` turn off. */
	async resolveForRun(
		profile: PromptProfile,
		flags: InstanceAiSkillFlags,
	): Promise<InstanceAiRunSkills> {
		const { source, disabledTools } = await loadInstanceAiPromptSkills(profile);
		const disabledSkillIds = disabledInstanceAiSkillIds(flags);
		return {
			source:
				disabledSkillIds.length > 0 ? filterRuntimeSkillSource(source, disabledSkillIds) : source,
			disabledTools,
		};
	}
}
