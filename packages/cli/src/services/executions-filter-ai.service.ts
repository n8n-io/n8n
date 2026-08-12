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

Rules:
- Only set fields the query actually specifies. Omit anything you're not confident about.
- "workflowId" must be the "id" of one of the workflows listed in the prompt, matched by name. Never invent an id. If no workflow is mentioned or none matches, omit it.
- "status" must be one of: all, error, canceled, new, running, success, waiting. Map "failed" and "crashed" to "error".
- "startDate" and "endDate" are ISO 8601 timestamps, resolved relative to the given current time and timezone.
- If the query gives a single point in time (e.g. "today", "this week"), set "startDate" to the start of that period and leave "endDate" unset unless the query also implies an end.`;

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
		const workflowList = request.workflows.length
			? request.workflows.map((workflow) => `- ${workflow.name} (id: ${workflow.id})`).join('\n')
			: '(none)';

		return `Current time: ${request.now}
Timezone: ${request.timezone}
Workflows visible to the user:
${workflowList}

Query: "${request.query}"`;
	}
}
