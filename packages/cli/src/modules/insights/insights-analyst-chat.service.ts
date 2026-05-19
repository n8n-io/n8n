import type {
	InsightsAnalystChatResponse,
	InsightsAnalystCitation,
	InsightsAnalystOverview,
	InsightsByWorkflow,
} from '@n8n/api-types';
import { insightsAnalystChatResponseSchema } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { z } from 'zod';

import { InsightsConfig } from './insights.config';
import { InsightsDemoService } from './insights-demo.service';

const llmResponseSchema = insightsAnalystChatResponseSchema.omit({ mode: true });

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
		if (!this.config.analystAnthropicApiKey) {
			return this.fallbackAnswer(question, overview);
		}

		try {
			const [{ createAnthropic }, { generateText }] = await Promise.all([
				import('@ai-sdk/anthropic'),
				import('ai'),
			]);
			const provider = createAnthropic({ apiKey: this.config.analystAnthropicApiKey });
			const result = await generateText({
				model: provider(this.config.analystModel),
				prompt: this.createPrompt(question, overview),
			});
			const parsed = this.parseLlmResponse(result.text, overview.byWorkflow.data);
			if (parsed) return { ...parsed, mode: 'llm' };
			this.logger.warn('Insights Analyst LLM returned malformed JSON', {
				model: this.config.analystModel,
			});
		} catch (error) {
			this.logger.warn('Insights Analyst LLM call failed, using fallback response', {
				model: this.config.analystModel,
				error,
			});
		}

		return this.fallbackAnswer(question, overview);
	}

	private createPrompt(question: string, overview: InsightsAnalystOverview): string {
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
			'You are an operations analyst for an n8n demo workspace.',
			'Answer the user with concise operational guidance grounded only in the JSON data.',
			'Return JSON only with this shape: {"answer":"string","citations":[{"workflowId":"string","workflowName":"string","metric":"string","value":number,"unit":"count|ratio|millisecond|minute"}]}.',
			'Every citation workflowId must come from the data.',
			`Question: ${question}`,
			`Workspace data: ${JSON.stringify({ summary: overview.summary, workflows })}`,
		].join('\n');
	}

	private parseLlmResponse(
		text: string,
		workflowRows: InsightsByWorkflow['data'],
	): Omit<InsightsAnalystChatResponse, 'mode'> | null {
		const jsonText = this.extractJsonObject(text);
		if (!jsonText) return null;

		const parsedJson = z
			.string()
			.transform((value, ctx) => {
				try {
					const parsedValue: unknown = JSON.parse(value);
					return parsedValue;
				} catch {
					ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid JSON' });
					return z.NEVER;
				}
			})
			.safeParse(jsonText);
		if (!parsedJson.success) return null;

		const parsed = llmResponseSchema.safeParse(parsedJson.data);
		if (!parsed.success) return null;

		const workflowIds = new Set(
			workflowRows.flatMap(({ workflowId }) => (workflowId ? [workflowId] : [])),
		);
		const citations = parsed.data.citations.filter(({ workflowId }) => workflowIds.has(workflowId));
		return {
			answer: parsed.data.answer,
			citations,
		};
	}

	private extractJsonObject(text: string): string | null {
		const start = text.indexOf('{');
		const end = text.lastIndexOf('}');
		if (start === -1 || end === -1 || end <= start) return null;
		return text.slice(start, end + 1);
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
