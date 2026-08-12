import type { ExecutionsNlFilterRequestDto } from '@n8n/api-types';
import { ExecutionsNlFilterResponseDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';

/** Cheap, fast model — this is a one-shot NL-to-JSON translation, not a task worth Opus-tier reasoning. */
const MODEL_ID = 'anthropic/claude-haiku-4-5';

const REQUEST_TIMEOUT_MS = 15_000;

const SYSTEM_PROMPT = `You translate a natural-language description of workflow executions into a filter object.
The prompt lists the user's workflows; everything else (tags, custom data) you have no visibility of, so extract those verbatim from the query as plain strings. Never invent IDs.

Rules:
- Only set fields the query actually specifies. Omit anything you're not confident about.
- "workflowNames" identifies workflows the query refers to. Match against the workflow list in the prompt and return the full names from that list exactly as written there — the query often carries only a fragment, an abbreviation, a differently-cased version, or a rough paraphrase of the real name.
- Only return a name that is in that list. If a mentioned workflow matches nothing in the list, or several candidates are equally plausible with nothing to separate them, omit it rather than guessing — a wrong workflow filter silently shows the wrong executions. Omit "workflowNames" entirely if the query names no workflow.
- Workflow names can themselves contain "&" or "and" (e.g. "Sales & Marketing"). Let the list settle whether such a phrase is one workflow or two: prefer whichever reading matches actual entries in it.
- "status" must be one of: all, error, canceled, new, running, success, waiting. Map "failed" and "crashed" to "error".
- "startDate" and "endDate" are ISO 8601 timestamps in the user's LOCAL time, carrying the same UTC offset as the current time given below. Write the wall-clock time the user means and append that offset — never convert to UTC and never end with "Z". If the current time is 2026-08-12T11:00:00+01:00, then "10am today" is "2026-08-12T10:00:00+01:00" and the start of today is "2026-08-12T00:00:00+01:00".
- Resolve times relative to that current time. Recognise a time period however it is phrased, including:
  - relative durations: "last 5 hours", "in the past 30 minutes", "previous 3 days", "over the last couple of weeks"
  - named periods: "today", "yesterday", "this week", "last month", "this quarter"
  - anchored or bounded points: "since Monday", "after 9am", "before 2026-01-01", "between March and April"
  Set "startDate" to the start of the period. Set "endDate" only when the query bounds the period on both sides or names an end; an open-ended period like "last 5 hours" or "since Monday" runs up to now, so leave "endDate" unset.
- "annotationTagNames" is a list of tag names as they appear in the query. Omit if the query mentions no tags.
- "vote" is the execution rating: "up" for good/positive/thumbs-up, "down" for bad/negative/thumbs-down. Omit unless the query is explicitly about the rating.
- "metadata" captures custom/highlighted execution data — arbitrary key-value pairs a user saved on the execution via an "Execution Data" node, not built-in execution fields. It has two sources:
  1. Explicit framing: "where the order id is 123" becomes key "order id", value "123".
  2. Unmatched field-like clauses: after you've accounted for workflow, status, dates, tags, and rating, if the query still names a field and a specific value for it — an ID, a proper noun, a quoted string, a number, an email, a code — treat that as metadata too. E.g. "customer_id 42" -> key "customer_id", value "42"; "invoice #A1234" -> key "invoice", value "A1234"; "runs for user jane@co.com" -> key "user", value "jane@co.com".
  The key must be a word or phrase that actually appears in the query. Never name the field yourself: if you had to invent a key (a "time_window", "period", "size", "type") to make a clause fit, that clause is not metadata — it belongs to one of the fields above, or nowhere.
  Anything describing when an execution ran, its status, its rating, its workflow, or its tags is never metadata, however it is worded — those clauses belong to the fields above even when the phrasing is unusual.
  Do NOT do this for vague descriptive language with no clear field name or no specific value ("large orders", "important runs", "the usual customer") — leave those unmatched rather than guessing a key/value for them; a wrong metadata filter can silently zero out the whole list. Set "exactMatch" to true only if the query asks for an exact match (e.g. "exactly", "precisely"); otherwise omit it. Omit "metadata" entirely if nothing in the query qualifies.`;

@Service()
export class ExecutionsFilterAiService {
	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly outboundHttp: OutboundHttp,
	) {}

	private get apiKey() {
		return this.globalConfig.aiBuilder.apiKey;
	}

	isConfigured() {
		return !!this.apiKey;
	}

	async translate(request: ExecutionsNlFilterRequestDto) {
		if (!this.isConfigured()) {
			throw new UserError(
				'Natural-language execution filtering is not configured. Set N8N_AI_ANTHROPIC_KEY to enable it.',
			);
		}

		const { createModel } = await import('@n8n/agents');
		const { generateText, Output } = await import('ai');

		const prompt = this.buildPrompt(request);

		this.logger.debug('Translating natural-language execution filter', { query: request.query });

		const result = await generateText({
			model: createModel(
				{ id: MODEL_ID, apiKey: this.apiKey },
				createAiProxyFetch(this.outboundHttp),
			),
			system: SYSTEM_PROMPT,
			prompt,
			output: Output.object({ schema: ExecutionsNlFilterResponseDto.schema }),
			maxOutputTokens: 512,
			abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		});

		return ExecutionsNlFilterResponseDto.parse(result.output);
	}

	private buildPrompt(request: ExecutionsNlFilterRequestDto): string {
		const workflowList = request.workflowNames.length
			? request.workflowNames.map((name) => `- ${name}`).join('\n')
			: '(none)';

		return `Current time: ${request.now}
Timezone: ${request.timezone}

The user's workflows:
${workflowList}

Query: "${request.query}"`;
	}
}
