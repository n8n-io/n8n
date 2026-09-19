import type { IntentRoute, RouterState } from './schemas';

/**
 * Deterministic cues. They form the prior the policy falls back to when the
 * decision service is unavailable, and they veto routes that cannot apply
 * (an edit without a bound target, an agent verify without an agent).
 */

const CUES: Array<{ route: Exclude<IntentRoute, 'answer' | 'orchestrator'>; weight: number; pattern: RegExp }> = [
	{ route: 'agent.create', weight: 3, pattern: /\b(create|build|make|set ?up|i need|i want|give me)\b[^.?!]{0,60}\b(agent|bot|assistant|chatbot)\b/i },
	{ route: 'agent.create', weight: 1, pattern: /\b(agent|bot|assistant|chatbot)\b[^.?!]{0,40}\b(that|which|who|to)\b/i },
	{ route: 'agent.edit', weight: 3, pattern: /\b(change|update|edit|add|remove|connect|rename|give|let|make)\b[^.?!]{0,60}\b(the |my |this )?(agent|bot|assistant)\b/i },
	{ route: 'agent.edit', weight: 2, pattern: /\b(the |my |this )(agent|bot|assistant)\b[^.?!]{0,40}\b(should|must|needs? to|can)\b/i },
	{ route: 'agent.verify', weight: 3, pattern: /\b(test|verify|try out|check)\b[^.?!]{0,40}\b(the |my |this )?(agent|bot|assistant)\b/i },
	{ route: 'workflow.create', weight: 3, pattern: /\b(create|build|make|set ?up|i need|i want|give me|generate)\b[^.?!]{0,60}\b(workflow|automation|pipeline|integration|endpoint|api|webhook|cron|scheduled job)\b/i },
	{ route: 'workflow.create', weight: 2, pattern: /\b(when|whenever|every)\b[^.?!]{0,80}\b(send|post|create|update|upsert|insert|store|save|notify|sync|call)\b/i },
	{ route: 'workflow.create', weight: 2, pattern: /\b(POST|GET|PUT|PATCH|DELETE)\s+\/[a-z0-9_\-/]+/ },
	{ route: 'workflow.edit', weight: 3, pattern: /\b(change|update|edit|add|remove|rename|move|replace|switch)\b[^.?!]{0,60}\b(the |my |this )?(workflow|node|step|trigger|schedule|channel|table|url)\b/i },
	{ route: 'workflow.edit', weight: 2, pattern: /\b(in|to|from)\s+(the |my |this )(workflow)\b/i },
	{ route: 'workflow.debug', weight: 3, pattern: /\b(debug|fix|failing|fails|failed|broken|not working|error(ed|s)?|why (does|did|is)|crash(es|ed)?|stuck)\b/i },
];

export interface CueScores {
	scores: Partial<Record<IntentRoute, number>>;
	matched: string[];
}

export function scoreCues(message: string): CueScores {
	const scores: Partial<Record<IntentRoute, number>> = {};
	const matched: string[] = [];
	for (const cue of CUES) {
		if (!cue.pattern.test(message)) continue;
		scores[cue.route] = (scores[cue.route] ?? 0) + cue.weight;
		matched.push(cue.route);
	}
	return { scores, matched };
}

/** Routes that cannot apply in the current state, with the reason. */
export function vetoedRoutes(state: RouterState): Partial<Record<IntentRoute, string>> {
	const vetoes: Partial<Record<IntentRoute, string>> = {};
	if (!state.boundWorkflowId) {
		vetoes['workflow.edit'] = 'no workflow is bound to this conversation';
		vetoes['workflow.debug'] = 'no workflow is bound to this conversation';
	}
	if (!state.boundAgentRef) {
		vetoes['agent.edit'] = 'no agent is bound to this conversation';
		vetoes['agent.verify'] = 'no agent is bound to this conversation';
	}
	if (state.hasAttachments) {
		for (const route of ['workflow.create', 'workflow.edit', 'workflow.debug', 'agent.create', 'agent.edit'] as const) {
			vetoes[route] = 'the message has attachments the compilers cannot read';
		}
	}
	if (state.hasActivePlan) {
		vetoes['workflow.create'] = 'a planned task graph is active';
		vetoes['agent.create'] = 'a planned task graph is active';
	}
	return vetoes;
}

/** Messages that are plainly conversational skip the read entirely. */
export function isSmallTalk(message: string): boolean {
	const trimmed = message.trim();
	if (trimmed.length === 0) return true;
	if (trimmed.length <= 3) return true;
	return /^(hi|hello|hey|thanks?|thank you|ok|okay|cool|great|yes|no|sure)[.!?]*$/i.test(trimmed);
}

/** Questions and explanations belong to the orchestrator even when they mention workflows. */
export function isQuestionOnly(message: string): boolean {
	const trimmed = message.trim();
	if (!/\?$/.test(trimmed)) return false;
	return /^(what|how|why|which|where|when|who|can you explain|is there|does|do|are|is|could you tell)\b/i.test(trimmed) && !/\b(create|build|make|set ?up|add|change|fix|debug)\b/i.test(trimmed);
}
