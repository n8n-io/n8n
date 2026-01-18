import type { ContextEstablishmentOptions } from '@n8n/decorators';
import type { INodeExecutionData } from 'n8n-workflow';

// Factory functions for test data
export const createTriggerItem = (headers?: Record<string, unknown>): INodeExecutionData => ({
	json: { headers },
	pairedItem: { item: 0 },
});

export const createOptions = (
	overrides?: Partial<ContextEstablishmentOptions>,
): ContextEstablishmentOptions =>
	({
		triggerItems: [createTriggerItem({ authorization: 'Bearer test-token-123' })],
		options: {},
		...overrides,
	}) as ContextEstablishmentOptions;
