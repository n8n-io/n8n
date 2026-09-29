import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';

import {
	renderAssistantDraft,
	sanitizeDiagnosticText,
	type FixWithAssistantI18n,
} from './fix-with-assistant';

/**
 * Detects preview-chat messages that ask the agent to change itself. The
 * preview chat only runs the agent — configuration changes belong to the AI
 * Assistant — so a match surfaces a hand-off note next to the message.
 *
 * ponytail: English keyword heuristic. Swap for a classifier if it misses too
 * much, e.g. for non-English messages.
 */

/** Setup nouns that read as the agent's own even without "your". */
const CORE_ASPECT =
	'instructions?|system prompts?|tools?|skills?|integrations?|channels?|guardrails?|mcp(?: servers?)?|sub-?agents?|vector stores?|evals?|evaluations?|knowledge(?: base)?|triggers?|schedules?|credentials?|models?|persona(?:lity)?';

/** Everyday words — they only mean the agent's setup when tied to the agent. */
const OWNED_ASPECT = `${CORE_ASPECT}|names?|prompts?|behaviou?rs?|settings?|configuration|config|descriptions?|icons?|rules?|temperature|memor(?:y|ies)`;

const CHANGE_VERB =
	'add|adjust|attach|change|configure|connect|delete|disable|drop|edit|enable|give|hook up|improve|install|modify|remove|rename|replace|set up|setup|swap|tweak|update';

/** Apostrophes included so "the agent's description" counts as two words, not three. */
const WORD = "[\\w']+";
/** Keeps someone else's things out: "improve my sales skills" is not a setup change. */
const NOT_THEIRS = '(?!(?:my|his|her|its|our|their)\\b)';
const AGENT_POSSESSIVE = "(?:your|yourself|(?:the|this) agent(?:'s)?)";

const ASPECT_PHRASE = `(?:(?:${CORE_ASPECT})|${AGENT_POSSESSIVE}\\s+(?:${WORD}\\s+){0,2}(?:${OWNED_ASPECT}))`;

/**
 * A change verb and part of the setup, close together, in either order:
 * "add a tool", "connect a Slack channel", "your instructions need an update".
 * They have to be near each other, or a stray verb turns a plain question
 * ("summarise your knowledge base") into a change request.
 */
const CHANGE_REQUEST_RE = new RegExp(
	'\\b(?:' +
		`(?:${CHANGE_VERB})\\b(?:\\s+${NOT_THEIRS}${WORD}){0,3}\\s+${NOT_THEIRS}${ASPECT_PHRASE}` +
		'|' +
		`${AGENT_POSSESSIVE}\\s+(?:${WORD}\\s+){0,3}(?:${OWNED_ASPECT})\\b(?:\\s+${WORD}){0,3}\\s+(?:${CHANGE_VERB})` +
		')\\b',
	'i',
);

/** Bounded to what the hand-off would actually send, so a pasted log stays cheap. */
const MAX_CHANGE_REQUEST_LENGTH = 4_000;

export function looksLikeAgentChangeRequest(text: string): boolean {
	return CHANGE_REQUEST_RE.test(text.slice(0, MAX_CHANGE_REQUEST_LENGTH));
}

/**
 * Draft that hands a preview-chat change request to the AI Assistant. The user
 * wrote this sentence themselves and sees it in the composer, so it goes across
 * as plain text — no fencing, no "treat this as data" preamble. It is still
 * scrubbed, because a pasted secret should not travel to another surface.
 */
export function buildAgentChangeRequestPrompt(
	changeRequest: string,
	i18n: FixWithAssistantI18n,
): string {
	// Scrub before the cut: slicing first can split a secret, leaving a prefix
	// the scrubber no longer recognises.
	const sanitized = scrubSecretsInText(sanitizeDiagnosticText(changeRequest.trim())).slice(
		0,
		MAX_CHANGE_REQUEST_LENGTH,
	);
	return renderAssistantDraft(
		i18n,
		'agents.builder.preview.editRequest.prompt.template',
		'request',
		sanitized,
	);
}
