import type {
	InsightsAnalystChatResponse,
	InsightsAnalystCitation,
	InsightsAnalystOverview,
	InsightsByWorkflow,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { z } from 'zod';

import { InsightsConfig } from './insights.config';
import { InsightsDemoService } from './insights-demo.service';

const llmOutputSchema = z.object({
	answer: z.string(),
	citations: z.array(
		z.object({
			workflowId: z.string(),
			workflowName: z.string(),
			metric: z.string(),
			value: z.number(),
			unit: z.enum(['count', 'ratio', 'millisecond', 'minute']),
		}),
	),
});

export type InsightsAnalystChatStreamChunk =
	| { type: 'delta'; text: string }
	| { type: 'complete'; response: InsightsAnalystChatResponse };

@Service()
export class InsightsAnalystChatService {
	constructor(
		private readonly config: InsightsConfig,
		private readonly insightsDemoService: InsightsDemoService,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('insights');
	}

	async ask(question: string): Promise<InsightsAnalystChatResponse> {
		const overview = await this.insightsDemoService.getOverview();
		if (!this.hasAnthropicApiKey()) {
			return this.fallbackAnswer(question, overview);
		}

		try {
			const llmResponse = await this.generateLlmResponse(question, overview);
			if (llmResponse) return llmResponse;
		} catch (error) {
			this.logger.warn('Insights Analyst LLM call failed, using fallback response', {
				model: this.config.analystModel,
				error,
			});
		}

		return this.fallbackAnswer(question, overview);
	}

	async *askStream(question: string): AsyncGenerator<InsightsAnalystChatStreamChunk> {
		const overview = await this.insightsDemoService.getOverview();
		if (!this.hasAnthropicApiKey()) {
			yield { type: 'complete', response: this.fallbackAnswer(question, overview) };
			return;
		}

		try {
			const [{ createAnthropic }, { streamObject }] = await Promise.all([
				import('@ai-sdk/anthropic'),
				import('ai'),
			]);
			const provider = createAnthropic({ apiKey: this.getAnthropicApiKey() });
			const result = streamObject({
				model: provider(this.config.analystModel),
				schema: llmOutputSchema,
				system: this.createSystemPrompt(),
				prompt: this.createUserPrompt(question, overview),
			});

			let previousAnswer = '';
			for await (const partial of result.partialObjectStream) {
				const nextAnswer = partial.answer ?? '';
				if (nextAnswer.length <= previousAnswer.length) continue;

				const delta = nextAnswer.slice(previousAnswer.length);
				previousAnswer = nextAnswer;
				if (delta) {
					yield { type: 'delta', text: delta };
				}
			}

			const object = await result.object;
			const llmResponse = this.toChatResponse(object, overview.byWorkflow.data);
			if (llmResponse) {
				yield { type: 'complete', response: llmResponse };
				return;
			}

			this.logger.warn('Insights Analyst streamed LLM returned invalid object', {
				model: this.config.analystModel,
			});
		} catch (error) {
			this.logger.warn('Insights Analyst streamed LLM call failed, using fallback response', {
				model: this.config.analystModel,
				error,
			});
		}

		yield { type: 'complete', response: this.fallbackAnswer(question, overview) };
	}

	private hasAnthropicApiKey(): boolean {
		return this.getAnthropicApiKey().length > 0;
	}

	private getAnthropicApiKey(): string {
		return this.config.analystAnthropicApiKey.trim();
	}

	private async generateLlmResponse(
		question: string,
		overview: InsightsAnalystOverview,
	): Promise<InsightsAnalystChatResponse | null> {
		const [{ createAnthropic }, { generateObject }] = await Promise.all([
			import('@ai-sdk/anthropic'),
			import('ai'),
		]);
		const provider = createAnthropic({ apiKey: this.getAnthropicApiKey() });
		const { object } = await generateObject({
			model: provider(this.config.analystModel),
			schema: llmOutputSchema,
			system: this.createSystemPrompt(),
			prompt: this.createUserPrompt(question, overview),
		});

		return this.toChatResponse(object, overview.byWorkflow.data);
	}

	private createSystemPrompt(): string {
		return [
			'You are an operations analyst for an n8n demo workspace.',
			'Answer with concise operational guidance grounded only in the provided workspace data.',
			'Every citation workflowId must come from the workspace data.',
		].join(' ');
	}

	private createUserPrompt(question: string, overview: InsightsAnalystOverview): string {
		const workflows = overview.byWorkflow.data.map((workflow) => ({
			workflowId: workflow.workflowId,
			workflowName: workflow.workflowName,
			total: workflow.total,
			failed: workflow.failed,
			failureRate: workflow.failureRate,
			averageRunTime: workflow.averageRunTime,
			timeSaved: workflow.timeSaved,
		}));

		return [
			`Question: ${question}`,
			`Workspace data: ${JSON.stringify({ summary: overview.summary, workflows })}`,
		].join('\n');
	}

	private toChatResponse(
		object: z.infer<typeof llmOutputSchema>,
		workflowRows: InsightsByWorkflow['data'],
	): InsightsAnalystChatResponse | null {
		const parsed = llmOutputSchema.safeParse(object);
		if (!parsed.success) return null;

		const workflowIds = new Set(
			workflowRows.flatMap(({ workflowId }) => (workflowId ? [workflowId] : [])),
		);
		const citations = parsed.data.citations.filter(({ workflowId }) => workflowIds.has(workflowId));

		return {
			mode: 'llm',
			answer: parsed.data.answer.trim(),
			citations,
		};
	}

	private fallbackAnswer(
		question: string,
		overview: InsightsAnalystOverview,
	): InsightsAnalystChatResponse {
		const normalized = question.toLowerCase();
		const rows = overview.byWorkflow.data;
		const topTimeSaved = this.getTopBy(rows, 'timeSaved');
		const lowestTimeSaved = this.getLowestBy(rows, 'timeSaved');
		const mostFailures = this.getTopBy(rows, 'failed');

		if (normalized.includes('fail')) {
			return {
				mode: 'fallback',
				answer: `${mostFailures.workflowName} is driving the failure increase with ${mostFailures.failed} failed executions. Start there, then compare its recent error shape with the lower-risk workflows before changing the broader process.`,
				citations: [
					this.createCitation(mostFailures, 'failed executions', mostFailures.failed, 'count'),
				],
			};
		}

		if (normalized.includes('summarize') || normalized.includes('ops review')) {
			return {
				mode: 'fallback',
				answer: `The demo workspace shows clear automation ROI from ${topTimeSaved.workflowName}, while ${lowestTimeSaved.workflowName} is a candidate for tuning. Failures are concentrated in ${mostFailures.workflowName}, so the operational review should focus on that workflow first. Overall, the portfolio is saving time while keeping the improvement backlog specific.`,
				citations: [
					this.createCitation(topTimeSaved, 'time saved', topTimeSaved.timeSaved, 'minute'),
					this.createCitation(mostFailures, 'failed executions', mostFailures.failed, 'count'),
				],
			};
		}

		return {
			mode: 'fallback',
			answer: `${topTimeSaved.workflowName} saved the most time with ${topTimeSaved.timeSaved} minutes saved. ${lowestTimeSaved.workflowName} saved the least, so it is the best workflow to inspect if the customer asks where the next optimization should happen.`,
			citations: [
				this.createCitation(topTimeSaved, 'time saved', topTimeSaved.timeSaved, 'minute'),
				this.createCitation(lowestTimeSaved, 'time saved', lowestTimeSaved.timeSaved, 'minute'),
			],
		};
	}

	private getTopBy(
		rows: InsightsByWorkflow['data'],
		key: 'timeSaved' | 'failed',
	): InsightsByWorkflow['data'][number] {
		return [...rows].sort((a, b) => b[key] - a[key])[0];
	}

	private getLowestBy(
		rows: InsightsByWorkflow['data'],
		key: 'timeSaved',
	): InsightsByWorkflow['data'][number] {
		return [...rows].sort((a, b) => a[key] - b[key])[0];
	}

	private createCitation(
		row: InsightsByWorkflow['data'][number],
		metric: string,
		value: number,
		unit: InsightsAnalystCitation['unit'],
	): InsightsAnalystCitation {
		return {
			workflowId: row.workflowId ?? '',
			workflowName: row.workflowName,
			metric,
			value,
			unit,
		};
	}
}
