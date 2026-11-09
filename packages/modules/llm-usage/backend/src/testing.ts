import { Container } from '@n8n/di';

import type { LlmUsage } from './llm-usage.entity';
import { LlmUsageRepository } from './llm-usage.repository';

export async function createLlmUsageCalls(calls: Array<Partial<LlmUsage>>) {
	await Container.get(LlmUsageRepository).insertIgnoringDuplicates(calls);
}

export async function deleteLlmUsageCalls() {
	await Container.get(LlmUsageRepository).delete({});
}
