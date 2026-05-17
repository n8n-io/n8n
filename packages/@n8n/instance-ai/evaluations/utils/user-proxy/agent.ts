import { SYSTEM_PROMPT, TOOL_DESCRIPTIONS } from './prompts';
import { decisionSchema, type Decision } from './tools';
import { createEvalAgent } from '../../../src/utils/eval-agents';
import type { EvalLogger } from '../../harness/logger';

export interface UserProxyAgentConfig {
	modelId?: string;
	logger?: EvalLogger;
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
				const decision = (result.structuredOutput as Decision | undefined) ?? undefined;
				if (!decision) {
					const failure = (result as { error?: unknown }).error;
					const message =
						failure instanceof Error ? `${failure.name}: ${failure.message}` : 'undefined';
					config.logger?.warn(`[user-proxy] no structuredOutput; error=${message}`);
				}
				return decision;
			} catch (caught) {
				const msg = caught instanceof Error ? caught.message : String(caught);
				config.logger?.warn(`[user-proxy] agent.generate threw: ${msg}`);
				return undefined;
			}
		},
	};
}
