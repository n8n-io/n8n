import { Service } from '@n8n/di';
import type { AiGatewayUsageResponse } from '@n8n/api-types';

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
		const byModel: AiGatewayUsageResponse['byModel'] = {};

		let totalRequests = 0;
		let totalInputTokens = 0;
		let totalOutputTokens = 0;
		const totalCost = 0;

		for (const record of this.records) {
			totalRequests++;
			totalInputTokens += record.inputTokens;
			totalOutputTokens += record.outputTokens;

			const entry = byModel[record.model] ?? {
				requests: 0,
				inputTokens: 0,
				outputTokens: 0,
				cost: 0,
			};
			entry.requests++;
			entry.inputTokens += record.inputTokens;
			entry.outputTokens += record.outputTokens;
			byModel[record.model] = entry;
		}

		return { totalRequests, totalInputTokens, totalOutputTokens, totalCost, byModel };
	}

	clear() {
		this.records = [];
	}
}

export interface UsageRecord {
	timestamp: Date;
	model: string;
	inputTokens: number;
	outputTokens: number;
}

const MAX_RECORDS = 10_000;
