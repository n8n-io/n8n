import { filterRuntimeSkillSource, type RuntimeSkillSource } from '@n8n/agents';
import { Service } from '@n8n/di';
import {
	disabledInstanceAiSkillIds,
	loadInstanceAiPromptSkills,
	loadInstanceAiRuntimeSkillSource,
	serveRuntimeSkillsFromWorkspace,
	type InstanceAiSkillFlags,
	type PromptProfile,
} from '@n8n/instance-ai';

export interface InstanceAiRunSkills {
	/** The skills of the run, with the paths of the bundled skill files. */
	catalog: RuntimeSkillSource;
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
		const catalog =
			disabledSkillIds.length > 0 ? filterRuntimeSkillSource(source, disabledSkillIds) : source;
		return { catalog, disabledTools };
	}

	/**
	 * Serve `catalog` from the skill files under `workspaceRoot` in the sandbox.
	 * Sandbox setup writes every bundled skill there before a sandbox command
	 * can run, so loading a skill does not wait for the sandbox.
	 */
	serveFromSandbox(catalog: RuntimeSkillSource, workspaceRoot: string): RuntimeSkillSource {
		return serveRuntimeSkillsFromWorkspace({
			source: catalog,
			storedSource: loadInstanceAiRuntimeSkillSource(),
			root: workspaceRoot,
		});
	}
}
