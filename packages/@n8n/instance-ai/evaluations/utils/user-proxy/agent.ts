// User-proxy agent factory. Short-lived (built per decide call);
// createEvalAgent's cache makes that cheap.

import { SYSTEM_PROMPT, TOOL_DESCRIPTIONS } from './prompts';
import { decisionSchema, type Decision } from './tools';
import { createEvalAgent } from '../../../src/utils/eval-agents';

export interface UserProxyAgentConfig {
	modelId?: string;
}

export interface UserProxyAgent {
	decide(userPrompt: string): Promise<Decision | undefined>;
}

export function createUserProxyAgent(config: UserProxyAgentConfig = {}): UserProxyAgent {
	const instructions = `${SYSTEM_PROMPT}\n\n${TOOL_DESCRIPTIONS}`;

	return {
		async decide(userPrompt: string): Promise<Decision | undefined> {
			const agent = createEvalAgent('eval-user-proxy', {
				...(config.modelId ? { model: config.modelId } : {}),
				instructions,
				cache: true,
			}).structuredOutput(decisionSchema);

			try {
				const result = await agent.generate(userPrompt);
				return (result.structuredOutput as Decision | undefined) ?? undefined;
			} catch {
				return undefined;
			}
		},
	};
}
