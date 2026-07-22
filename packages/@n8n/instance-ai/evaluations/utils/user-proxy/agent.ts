import { SYSTEM_PROMPT } from './prompts';
import { decisionSchema, TOOL_DESCRIPTIONS, type Decision } from './tools';
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
					config.logger?.warn(
						`[user-proxy] no structuredOutput; error=${describeFailure((result as { error?: unknown }).error)}`,
					);
				}
				return decision;
			} catch (caught) {
				config.logger?.warn(`[user-proxy] agent.generate threw: ${describeFailure(caught)}`);
				return undefined;
			}
		},
	};
}

function describeFailure(value: unknown): string {
	if (value === undefined) return 'undefined';
	if (value instanceof Error) return `${value.name}: ${value.message}`;
	if (typeof value === 'string') return value;
	try {
		return JSON.stringify(value).slice(0, 600);
	} catch {
		return '[unable to stringify]';
	}
}
