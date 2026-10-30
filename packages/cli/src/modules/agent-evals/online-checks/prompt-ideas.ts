import { asString, readJsonObject } from './json-text';
import { describeAgentSetup, findQuote, normalize } from './promise-checks';
import type { PromiseCheckInput, SkillText } from './promise-checks';
import type { AgentToolProfile } from './types';

export const MAX_IDEA_PROMPT_LENGTH = 300;

/**
 * What an idea tries: the most common request, one written rule, or one tool
 * that changes something. One idea of each kind at most.
 */
export type PromptIdeaKind = 'everyday' | 'rule' | 'action';

const KIND_ORDER: PromptIdeaKind[] = ['everyday', 'rule', 'action'];

export interface PromptIdea {
	kind: PromptIdeaKind;
	/** The message the author can send, as the agent's user would type it. */
	prompt: string;
	/** One sentence for the author on what the idea tries. */
	why: string;
	/** For a `rule` idea: the sentence of the instructions or a skill it tests. */
	source?: { field: 'instructions' | 'skills'; quote: string };
	/** For an `action` idea: the tool it makes the agent use. */
	tool?: string;
}

export interface DroppedIdea {
	prompt?: string;
	why:
		| 'missing-field'
		| 'too-long'
		| 'quote-not-found'
		| 'unknown-tool'
		| 'tool-only-reads'
		| 'duplicate-kind';
}

export interface ParsedPromptIdeas {
	ideas: PromptIdea[];
	dropped: DroppedIdea[];
	unreadable?: true;
}

const SYSTEM = `You read the setup of an AI agent and suggest messages its author can send to try the agent in a test chat. The author then judges the reply, so each message must lead to a reply worth judging.

Write at most 3 ideas, one of each kind:
- "everyday": the most common request a real user of this agent would make.
- "rule": a message that puts ONE rule from the instructions or a skill to the test: a situation in which the agent could break it. Copy the exact sentence of the rule into "quote". Leave this kind out when the setup has no clear rule.
- "action": a message that makes the agent use a tool that changes something (sends, writes, books, deletes). Put the exact tool name into "tool". Only tools marked "acts" count. Leave this kind out when no tool acts.

Each prompt:
- Is written as the agent's user would type it: first person, one or two sentences, at most ${MAX_IDEA_PROMPT_LENGTH} characters.
- Works on its own, without earlier messages.
- Does not depend on ids, names, or numbers that real data would not have. Ask about "my latest order", not "order #1042".
- Asks for something the agent is meant to do, or that its rules say how to handle. Never ask it to cause harm.

For each idea also write "why": one short sentence for the author on what the idea tries.

Write the prompts and the "why" sentences in the same language as the instructions. Copy the quote in its original language.

Answer with JSON only:
{"ideas":[{"kind":"everyday","prompt":"...","why":"..."},{"kind":"rule","prompt":"...","why":"...","quote":"..."},{"kind":"action","prompt":"...","why":"...","tool":"..."}]}`;

export function buildPromptIdeasPrompt(input: PromiseCheckInput): { system: string; user: string } {
	return { system: SYSTEM, user: describeAgentSetup(input) };
}

function isKind(value: string | undefined): value is PromptIdeaKind {
	return KIND_ORDER.includes(value as PromptIdeaKind);
}

/**
 * Keep an idea only when what it points at is real: a rule idea's quote must be
 * in the instructions or a skill, and an action idea's tool must exist and act.
 * A bad idea costs the author nothing, since they simply don't pick it, but an
 * idea that names a rule or a tool the agent does not have misleads them.
 */
export function parsePromptIdeas(
	text: string,
	sources: { instructions: string; skills: SkillText[]; tools: AgentToolProfile[] },
): ParsedPromptIdeas {
	const json = readJsonObject(text);
	if (!json || !Array.isArray(json.ideas)) return { ideas: [], dropped: [], unreadable: true };

	const instructions = normalize(sources.instructions);
	const skillTexts = sources.skills.map((s) =>
		normalize(`${s.description ?? ''}\n${s.instructions}`),
	);
	const byKind = new Map<PromptIdeaKind, PromptIdea>();
	const dropped: DroppedIdea[] = [];

	for (const raw of json.ideas as unknown[]) {
		const item = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
		const kind = asString(item.kind);
		const prompt = asString(item.prompt)?.trim();
		const why = asString(item.why)?.trim();
		if (!isKind(kind) || !prompt || !why) {
			dropped.push({ prompt, why: 'missing-field' });
			continue;
		}
		if (prompt.length > MAX_IDEA_PROMPT_LENGTH) {
			dropped.push({ prompt, why: 'too-long' });
			continue;
		}
		if (byKind.has(kind)) {
			dropped.push({ prompt, why: 'duplicate-kind' });
			continue;
		}

		const idea: PromptIdea = { kind, prompt, why };
		if (kind === 'rule') {
			const quote = asString(item.quote);
			const field = quote ? findQuote(normalize(quote), instructions, skillTexts) : null;
			if (!quote || !field) {
				dropped.push({ prompt, why: 'quote-not-found' });
				continue;
			}
			idea.source = { field, quote };
		}
		if (kind === 'action') {
			const tool = sources.tools.find((t) => t.name === asString(item.tool));
			if (!tool) {
				dropped.push({ prompt, why: 'unknown-tool' });
				continue;
			}
			if (tool.action !== 'acts') {
				dropped.push({ prompt, why: 'tool-only-reads' });
				continue;
			}
			idea.tool = tool.name;
		}
		byKind.set(kind, idea);
	}

	const ideas = KIND_ORDER.flatMap((kind) => {
		const idea = byKind.get(kind);
		return idea ? [idea] : [];
	});
	return { ideas, dropped };
}
