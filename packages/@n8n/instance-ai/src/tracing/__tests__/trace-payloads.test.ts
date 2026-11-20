import { CHANGE_DATA_TABLES_TOOL_NAME } from '@n8n/api-types';
import { describe, expect, it } from 'vitest';

import { redactLangSmithTelemetrySpan } from '../trace-payloads';

describe('redactLangSmithTelemetrySpan', () => {
	it('scrubs row values nested in batch data table changes', () => {
		const span = {
			name: 'ai.toolCall',
			attributes: {
				'ai.operationId': 'ai.toolCall',
				'langsmith.span.kind': 'tool',
				'ai.toolCall.name': CHANGE_DATA_TABLES_TOOL_NAME,
				'ai.toolCall.id': 'toolu-batch',
				'ai.toolCall.args': JSON.stringify({
					changes: [
						{ action: 'insert-rows', table: 'leads', rows: [{ email: 'jane.doe@example.com' }] },
						{
							action: 'update-rows',
							table: 'leads',
							filter: { type: 'and', filters: [] },
							data: { email: 'john.roe@example.com' },
						},
					],
				}),
			},
		};

		const redacted = redactLangSmithTelemetrySpan(span) as { attributes: Record<string, unknown> };
		const args = String(redacted.attributes['ai.toolCall.args']);

		expect(args).not.toContain('jane.doe@example.com');
		expect(args).not.toContain('john.roe@example.com');
		expect(args).toContain('insert-rows');
	});
});
