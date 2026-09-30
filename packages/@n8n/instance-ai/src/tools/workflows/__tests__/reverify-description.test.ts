import { zodToJsonSchema } from '@n8n/agents';

import { verifyBuiltWorkflowInputSchema } from '../../orchestration/verify-built-workflow.tool';
import { reverifyInputSchema } from '../reverify-description';

const withoutDescriptions = (value: unknown): unknown =>
	Array.isArray(value)
		? value.map(withoutDescriptions)
		: value && typeof value === 'object'
			? Object.fromEntries(
					Object.entries(value)
						.filter(([key]) => key !== 'description')
						.map(([key, entry]) => [key, withoutDescriptions(entry)]),
				)
			: value;

describe('reverifyInputSchema', () => {
	it('keeps every verify field and shortens the text', () => {
		const compact = zodToJsonSchema(reverifyInputSchema(verifyBuiltWorkflowInputSchema) as never);
		const full = zodToJsonSchema(verifyBuiltWorkflowInputSchema);

		expect(withoutDescriptions(compact)).toEqual(withoutDescriptions(full));
		expect(JSON.stringify(compact).length).toBeLessThan(JSON.stringify(full).length);
	});

	it('returns a non-object schema unchanged', () => {
		const schema = { type: 'object' as const };
		expect(reverifyInputSchema(schema)).toBe(schema);
	});
});
