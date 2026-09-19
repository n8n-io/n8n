import { AGENT_MODEL_PROVIDERS, AGENT_MODEL_STRING_REGEX } from '@n8n/api-types';

import { tokenize } from '../../workflow-compiler/catalog/retrieval';
import {
	detectIntegrations,
	detectScheduleCron,
	splitActionPhrases,
} from '../../workflow-compiler/requirements/extract';
import {
	missing,
	resolved,
	type RequestedAction,
} from '../../workflow-compiler/requirements/types';
import type { AgentChannelType } from '../ir/schema';
import type { AgentRequirements, ChannelMention } from './types';

const CHANNEL_ALIASES: Array<{ name: string; pattern: RegExp; type?: AgentChannelType }> = [
	{ name: 'slack', pattern: /\bslack\b/i, type: 'slack' },
	{ name: 'telegram', pattern: /\btelegram\b/i, type: 'telegram' },
	{ name: 'discord', pattern: /\bdiscord\b/i, type: 'discord' },
	{ name: 'linear', pattern: /\blinear\b/i, type: 'linear' },
	{ name: 'whatsapp', pattern: /\bwhats ?app\b/i },
	{ name: 'teams', pattern: /\b(microsoft )?teams\b/i },
	{
		name: 'email',
		pattern: /\b(e-?mail|gmail|outlook)\b(?=.*\b(agent|chat|talk|message me|reply)\b)/i,
	},
	{ name: 'sms', pattern: /\b(sms|text message)\b/i },
];

const TOOL_VERB_WORDS =
	'send|post|notify|create|update|upsert|insert|store|save|log|record|look ?up|fetch|search|query|find|read|check|book|schedule|delete|archive|run|call|trigger|add|sync|draft|open|close|assign|escalate';
const TOOL_VERBS = new RegExp(`\\b(${TOOL_VERB_WORDS})(s|es|ed|ing)?\\b`, 'i');
/** "upsert leads in HubSpot and post a summary" is two tool actions; split on "and" only before a tool verb. */
const AND_BEFORE_VERB = new RegExp(
	`\\s+and\\s+(?=(?:then\\s+)?(?:${TOOL_VERB_WORDS})(?:s|es|ed|ing)?\\b)`,
	'i',
);
const INTENT_PHRASE =
	/\b(create|build|make|set ?up|need|want|give me)\b.*\b(agent|bot|assistant)\b/i;
const CHANNEL_CONTEXT =
	/\b(via|through|on|in|from|over|using)\s+(slack|telegram|discord|linear|whatsapp|teams)\b|\b(slack|telegram|discord|linear|whatsapp|teams)\s+(agent|bot|assistant|chat|channel)\b|\b(agent|bot|assistant)\s+(for|in|on)\s+(slack|telegram|discord|linear|whatsapp|teams)\b/i;

export interface AgentExtractionContext {
	existingName?: string;
}

export function detectChannels(text: string): ChannelMention[] {
	return CHANNEL_ALIASES.filter(({ pattern }) => pattern.test(text)).map(({ name, type }) => ({
		name,
		supported: type !== undefined,
		...(type ? { type } : {}),
	}));
}

function detectModel(text: string): { provider?: string; model?: string } {
	const explicit = text.match(/\b([a-z0-9-]+\/[a-z0-9._:-]+(?:\/[a-z0-9._:-]+)*)\b/i)?.[1];
	if (
		explicit &&
		AGENT_MODEL_STRING_REGEX.test(explicit) &&
		AGENT_MODEL_PROVIDERS.some((p) => explicit.toLowerCase().startsWith(`${p}/`))
	) {
		return { model: explicit.toLowerCase(), provider: explicit.split('/')[0].toLowerCase() };
	}
	const lower = text.toLowerCase();
	const aliases: Array<[RegExp, string]> = [
		[/\b(claude|anthropic)\b/, 'anthropic'],
		[/\b(gpt|openai|o[13]\b)/, 'openai'],
		[/\b(gemini|google)\b/, 'google'],
		[/\bmistral\b/, 'mistral'],
		[/\b(grok|xai)\b/, 'xai'],
		[/\bgroq\b/, 'groq'],
		[/\bdeepseek\b/, 'deepseek'],
		[/\bbedrock\b/, 'aws-bedrock'],
		[/\bazure\b/, 'azure-openai'],
		[/\bopenrouter\b/, 'openrouter'],
	];
	for (const [pattern, provider] of aliases) {
		if (pattern.test(lower) && /\b(model|use|using|with|run on|powered by)\b/.test(lower))
			return { provider };
	}
	return {};
}

function slugId(text: string, index: number): string {
	return `${tokenize(text).slice(0, 3).join('-') || 'tool'}-${index + 1}`;
}

function isChannelPhrase(phrase: string): boolean {
	return CHANNEL_CONTEXT.test(phrase) && !TOOL_VERBS.test(phrase.replace(CHANNEL_CONTEXT, ''));
}

function derivePurpose(text: string): string | undefined {
	const sentence = text
		.split(/(?<=[.!?])\s+|\n+/)
		.map((part) => part.trim())
		.find((part) => part.length > 12);
	if (!sentence) return undefined;
	return sentence
		.replace(/^(please\s+)?(create|build|make|set ?up|i need|i want|give me)\s+(an?\s+)?/i, '')
		.replace(/[.]$/, '');
}

function deriveName(purpose: string | undefined, channels: ChannelMention[]): string {
	const base = purpose?.match(
		/\b(?:an?\s+)?([a-z][a-z\s-]{2,40}?)\s+(agent|bot|assistant)\b/i,
	)?.[1];
	if (base) return `${capitalizeWords(base.trim())} Agent`;
	const channel = channels.find((mention) => mention.supported)?.name;
	if (channel) return `${capitalizeWords(channel)} Agent`;
	const words = purpose ? tokenize(purpose).slice(0, 3).map(capitalizeWords) : [];
	return words.length > 0 ? `${words.join(' ')} Agent` : 'New Agent';
}

function capitalizeWords(value: string): string {
	return value.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/**
 * Deterministic requirement extraction for an agent request. Records what
 * the text states and leaves the rest missing; a bounded decision or a
 * clarification fills the gaps, never a guess.
 */
export function extractAgentRequirements(
	request: string,
	context: AgentExtractionContext = {},
): AgentRequirements {
	const channels = detectChannels(request);
	const model = detectModel(request);
	const purpose = derivePurpose(request);
	const explicitName =
		request.match(/\b(?:called|named)\s+["“]([^"”]+)["”]/i)?.[1] ??
		request.match(/\b(?:called|named)\s+([A-Z][\w-]*(?:\s+[A-Z][\w-]*)*)/)?.[1];

	const toolActions: RequestedAction[] = [];
	const workflowTools: string[] = [];
	const subAgentNames: string[] = [];
	const rules: string[] = [];
	const phrases = splitActionPhrases(request).flatMap((phrase) =>
		phrase
			.split(AND_BEFORE_VERB)
			.map((part) => part.trim())
			.filter(Boolean),
	);
	phrases.forEach((rawPhrase, index) => {
		const phrase = rawPhrase.replace(/[.!?]+$/, '').trim();
		const workflow = phrase.match(
			/\b(?:use|call|run|attach|trigger)s?\s+(?:the\s+)?["“]?([^"”,.]+?)["”]?\s+workflow\b/i,
		)?.[1];
		if (workflow) {
			workflowTools.push(workflow.trim());
			return;
		}
		const subAgent = phrase.match(
			/\b(?:delegate|hand off|escalate)\s+(?:.*?\s+)?to\s+(?:the\s+)?["“]?([^"”,.]+?)["”]?(?:\s+(?:agent|sub-agent))?\s*$/i,
		)?.[1];
		if (subAgent) {
			subAgentNames.push(subAgent.trim());
			return;
		}
		if (
			/\b(never|always|do not|don't|must|only|avoid)\b/i.test(phrase) &&
			!TOOL_VERBS.test(phrase)
		) {
			rules.push(phrase.replace(/[.]$/, ''));
			return;
		}
		if (/\b(never|always|do not|don't|must not|only ever)\b/i.test(phrase)) {
			rules.push(phrase.replace(/[.]$/, ''));
			return;
		}
		if (!TOOL_VERBS.test(phrase) || isChannelPhrase(phrase) || INTENT_PHRASE.test(phrase)) return;
		if (/\b(remember|recall|memory|web search|search the web|browse)\b/i.test(phrase)) return;
		const integration = detectIntegrations(phrase)[0];
		const params: Record<string, unknown> = {};
		const channel = phrase.match(/#[a-z0-9_-]+/i)?.[0];
		if (channel) params.channel = channel;
		const table = phrase.match(/\b(?:table|into)\s+["'`]?([a-z_][a-z0-9_]*)["'`]?/i)?.[1];
		if (table && integration === 'postgres') params.table = table;
		const url = phrase.match(/https?:\/\/\S+/i)?.[0];
		if (url) params.url = url.replace(/[.,)]$/, '');
		toolActions.push({
			id: slugId(phrase, index),
			text: phrase,
			...(integration ? { integration } : {}),
			params,
		});
	});

	const schedules = [
		...request.matchAll(
			/([^.!?\n]*\b(every|daily|nightly|hourly|weekly|each (day|morning|week|hour)|at \d{1,2}(:\d{2})?\s?(am|pm)?)\b[^.!?\n]*)/gi,
		),
	].map((match) => {
		const text = match[1].trim();
		return { text, cron: detectScheduleCron(text) ?? undefined };
	});

	return {
		intent: resolved(context.existingName ? 'edit' : 'create', 'user'),
		name: explicitName
			? resolved(explicitName, 'user')
			: context.existingName
				? resolved(context.existingName, 'workflow')
				: resolved(deriveName(purpose, channels), 'default'),
		purpose: purpose
			? resolved(purpose, 'user')
			: missing('What should this agent do, and for whom?'),
		channels,
		toolActions,
		workflowTools,
		subAgentNames,
		schedules,
		memory: {
			observational:
				/\b(remember|recall|context across|previous conversations|conversation history|long[- ]term memory)\b/i.test(
					request,
				),
			episodic: /\b(episodic|remember (facts|preferences)|learn about (the )?user)\b/i.test(
				request,
			),
		},
		webSearch:
			/\b(search the web|web search|browse the web|look things up online|internet)\b/i.test(
				request,
			),
		...(model.provider ? { modelProvider: model.provider } : {}),
		...(model.model ? { explicitModel: model.model } : {}),
		approvalPolicy:
			/\b(ask (me )?(before|first)|confirm (before|first)|with (my )?approval|require approval)\b/i.test(
				request,
			)
				? 'ask_always'
				: /\b(without asking|no approval|autonomously|automatically without)\b/i.test(request)
					? 'never_ask'
					: 'ask_for_writes',
		rules,
		answers: {},
	};
}
