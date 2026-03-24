import { Service } from '@n8n/di';
import type { AiGatewayUsageResponse } from '@n8n/api-types';

export interface UsageRecord {
	timestamp: Date;
	workflowId?: string;
	executionId?: string;
	category: string;
	resolvedModel: string;
	inputTokens: number;
	outputTokens: number;
}

const MAX_RECORDS = 10_000;

@Service()
export class AiGatewayUsageService {
	private records: UsageRecord[] = [];

	track(record: UsageRecord) {
		this.records.push(record);

		if (this.records.length > MAX_RECORDS) {
			this.records = this.records.slice(-MAX_RECORDS);
		}
	}

	getUsage(): AiGatewayUsageResponse {
		const byCategory: AiGatewayUsageResponse['byCategory'] = {};
		const byModel: AiGatewayUsageResponse['byModel'] = {};

		let totalRequests = 0;
		let totalInputTokens = 0;
		let totalOutputTokens = 0;

		for (const record of this.records) {
			totalRequests++;
			totalInputTokens += record.inputTokens;
			totalOutputTokens += record.outputTokens;

			const cat = byCategory[record.category] ?? { requests: 0, inputTokens: 0, outputTokens: 0 };
			cat.requests++;
			cat.inputTokens += record.inputTokens;
			cat.outputTokens += record.outputTokens;
			byCategory[record.category] = cat;

			const modelKey = record.resolvedModel || 'unknown';
			const m = byModel[modelKey] ?? { requests: 0, inputTokens: 0, outputTokens: 0 };
			m.requests++;
			m.inputTokens += record.inputTokens;
			m.outputTokens += record.outputTokens;
			byModel[modelKey] = m;
		}

		return { totalRequests, totalInputTokens, totalOutputTokens, byCategory, byModel };
	}

	/**
	 * Extract token usage from an OpenAI-compatible response body.
	 * Works for both non-streaming responses and final SSE chunks.
	 */
	extractUsageFromResponseBody(body: Record<string, unknown>): {
		inputTokens: number;
		outputTokens: number;
	} {
		const usage = body.usage as Record<string, number> | undefined;
		return {
			inputTokens: usage?.prompt_tokens ?? 0,
			outputTokens: usage?.completion_tokens ?? 0,
		};
	}

	clear() {
		this.records = [];
	}
}
