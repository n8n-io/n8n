import type { FetchFn, ModelConfig } from '@n8n/agents';

import type { PlanLlm } from './plan-hydrator';

/** The model that serves a guarded run. Lazy, because resolving a credential costs a lookup. */
export interface HydrationModel {
	resolve(): Promise<ModelConfig>;
	fetch?: FetchFn;
}

/** Builds a PlanLlm: one model turn with no tools, with the model of the agent under test. */
export function createPlanLlm(model: HydrationModel): PlanLlm {
	return async ({ instructions, prompt }) => {
		const { Agent } = await import('@n8n/agents');
		const agent = new Agent('mcp-guard-planner').model(await model.resolve());
		if (model.fetch) agent.modelFetch(model.fetch);
		agent.instructions(instructions);
		const result = await agent.generate(prompt, { maxIterations: 1 });
		// The answer is the text of the last assistant message.
		const last = [...result.messages].reverse().find((m) => 'role' in m && m.role === 'assistant');
		const content = last && 'content' in last && Array.isArray(last.content) ? last.content : [];
		return content.flatMap((c) => (c.type === 'text' ? [c.text] : [])).join('');
	};
}
