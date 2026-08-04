import { SYSTEM_PROMPT } from './prompts';
import {
	CONFIRMATION_TOOL_DESCRIPTIONS,
	confirmationDecisionSchema,
	USER_TURN_TOOL_DESCRIPTIONS,
	userTurnDecisionSchema,
	type Decision,
	type ProxyDecisionMode,
} from './tools';
import { createEvalAgent } from '../../../src/utils/eval-agents';
import type { EvalLogger } from '../../harness/logger';

export interface UserProxyAgentConfig {
	modelId?: string;
	logger?: EvalLogger;
}

export interface UserProxyAgent {
	decide(userPrompt: string, mode: ProxyDecisionMode): Promise<Decision | undefined>;
}

export function createUserProxyAgent(config: UserProxyAgentConfig = {}): UserProxyAgent {
	return {
		async decide(userPrompt: string, mode: ProxyDecisionMode): Promise<Decision | undefined> {
			// The schema handed to the model is the action menu for this moment in
			// the conversation — actions that cannot function now are not offered.
			const schema = mode === 'user-turn' ? userTurnDecisionSchema : confirmationDecisionSchema;
			const toolDescriptions =
				mode === 'user-turn' ? USER_TURN_TOOL_DESCRIPTIONS : CONFIRMATION_TOOL_DESCRIPTIONS;
			const agent = createEvalAgent('eval-user-proxy', {
				...(config.modelId ? { model: config.modelId } : {}),
				instructions: `${SYSTEM_PROMPT}\n\n${toolDescriptions}`,
				cache: true,
			}).structuredOutput(schema);

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
