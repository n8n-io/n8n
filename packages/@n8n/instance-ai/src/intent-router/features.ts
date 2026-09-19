import type { IntentRoute, RouterState } from './schemas';

type CueRoute = Exclude<IntentRoute, 'answer' | 'orchestrator'>;

/**
 * Deterministic cues. They form the prior the policy falls back to when the
 * decision service is unavailable, and they veto routes that cannot apply
 * (an edit without a bound target, an agent verify without an agent).
 */
const CUES: Array<[route: CueRoute, weight: number, pattern: RegExp]> = [
	[
		'agent.create',
		3,
		/\b(create|build|make|set ?up|i need|i want|give me)\b[^.?!]{0,60}\b(agent|bot|assistant|chatbot)\b/i,
	],
	['agent.create', 1, /\b(agent|bot|assistant|chatbot)\b[^.?!]{0,40}\b(that|which|who|to)\b/i],
	[
		'agent.edit',
		3,
		/\b(change|update|edit|add|remove|connect|rename|give|let|make)\b[^.?!]{0,60}\b(the |my |this )?(agent|bot|assistant)\b/i,
	],
	[
		'agent.edit',
		2,
		/\b(the |my |this )(agent|bot|assistant)\b[^.?!]{0,40}\b(should|must|needs? to|can)\b/i,
	],
	[
		'agent.verify',
		3,
		/\b(test|verify|try out|check)\b[^.?!]{0,40}\b(the |my |this )?(agent|bot|assistant)\b/i,
	],
	[
		'workflow.create',
		3,
		/\b(create|build|make|set ?up|i need|i want|give me|generate)\b[^.?!]{0,60}\b(workflow|automation|pipeline|integration|endpoint|api|webhook|cron|scheduled job)\b/i,
	],
	[
		'workflow.create',
		2,
		/\b(when|whenever|every)\b[^.?!]{0,80}\b(send|post|create|update|upsert|insert|store|save|notify|sync|call)\b/i,
	],
	['workflow.create', 2, /\b(POST|GET|PUT|PATCH|DELETE)\s+\/[a-z0-9_\-/]+/],
	[
		'workflow.edit',
		3,
		/\b(change|update|edit|add|remove|rename|move|replace|switch)\b[^.?!]{0,60}\b(the |my |this )?(workflow|node|step|trigger|schedule|channel|table|url)\b/i,
	],
	['workflow.edit', 2, /\b(in|to|from)\s+(the |my |this )(workflow)\b/i],
	[
		'workflow.debug',
		3,
		/\b(debug|fix|failing|fails|failed|broken|not working|error(ed|s)?|why (does|did|is)|crash(es|ed)?|stuck)\b/i,
	],
];

export interface CueScores {
	scores: Partial<Record<IntentRoute, number>>;
	matched: string[];
}

export function scoreCues(message: string): CueScores {
	const scores: Partial<Record<IntentRoute, number>> = {};
	const matched: string[] = [];
	for (const [route, weight, pattern] of CUES) {
		if (!pattern.test(message)) continue;
		scores[route] = (scores[route] ?? 0) + weight;
		matched.push(route);
	}
	return { scores, matched };
}

/** Routes that cannot apply in the current state, with the reason. */
export function vetoedRoutes(state: RouterState): Partial<Record<IntentRoute, string>> {
	const vetoes: Partial<Record<IntentRoute, string>> = {};
	const veto = (routes: IntentRoute[], reason: string) => {
		for (const route of routes) vetoes[route] = reason;
	};
	if (!state.boundWorkflowId)
		veto(['workflow.edit', 'workflow.debug'], 'no workflow is bound to this conversation');
	if (!state.boundAgentRef)
		veto(['agent.edit', 'agent.verify'], 'no agent is bound to this conversation');
	if (state.hasAttachments)
		veto(
			['workflow.create', 'workflow.edit', 'workflow.debug', 'agent.create', 'agent.edit'],
			'the message has attachments the compilers cannot read',
		);
	if (state.hasActivePlan)
		veto(['workflow.create', 'agent.create'], 'a planned task graph is active');
	return vetoes;
}

/** Messages that are plainly conversational skip the read entirely. */
export function isSmallTalk(message: string): boolean {
	const trimmed = message.trim();
	if (trimmed.length <= 3) return true;
	return /^(hi|hello|hey|thanks?|thank you|ok|okay|cool|great|yes|no|sure)[.!?]*$/i.test(trimmed);
}

/** Questions and explanations belong to the orchestrator even when they mention workflows. */
export function isQuestionOnly(message: string): boolean {
	const trimmed = message.trim();
	if (!/\?$/.test(trimmed)) return false;
	return (
		/^(what|how|why|which|where|when|who|can you explain|is there|does|do|are|is|could you tell)\b/i.test(
			trimmed,
		) && !/\b(create|build|make|set ?up|add|change|fix|debug)\b/i.test(trimmed)
	);
}
