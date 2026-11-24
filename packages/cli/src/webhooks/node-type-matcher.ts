import type { IWebhookDescription } from 'n8n-workflow';

export type ExpectedWebhookNodeType = NonNullable<IWebhookDescription['nodeType']>;

export function matchesExpectedNodeType(
	expected: ExpectedWebhookNodeType,
	declared: IWebhookDescription['nodeType'] = 'webhook',
): boolean {
	return expected === declared;
}
