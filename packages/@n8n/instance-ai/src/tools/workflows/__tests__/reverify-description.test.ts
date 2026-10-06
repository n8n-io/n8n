import { zodToJsonSchema } from '@n8n/agents';
import { createHash } from 'node:crypto';

import type { OrchestrationContext } from '../../../types';
import {
	createVerifyBuiltWorkflowTool,
	verifyBuiltWorkflowInputSchema,
} from '../../orchestration/verify-built-workflow.tool';
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
	it('keeps every verify field, adds the slice keys, and shortens the text', () => {
		const compact = zodToJsonSchema(reverifyInputSchema(verifyBuiltWorkflowInputSchema) as never);
		const full = zodToJsonSchema(verifyBuiltWorkflowInputSchema);
		const { until, variants, ...verifyFields } = (compact as { properties: object }).properties as {
			until: unknown;
			variants: unknown;
		};

		expect(withoutDescriptions({ ...compact, properties: verifyFields })).toEqual(
			withoutDescriptions(full),
		);
		expect(withoutDescriptions({ until, variants })).toEqual({
			until: { type: 'string', minLength: 1 },
			variants: { type: 'boolean' },
		});
		expect(JSON.stringify(compact).length).toBeLessThan(JSON.stringify(full).length);
	});

	it('leaves the verify tool without node contracts byte for byte as before', () => {
		const tool = createVerifyBuiltWorkflowTool({} as OrchestrationContext);
		const text = JSON.stringify({
			description: tool.description,
			input: zodToJsonSchema(verifyBuiltWorkflowInputSchema),
		});

		expect(createHash('sha256').update(text).digest('hex')).toBe(
			'a462af0998dd289d8e034e403f6b3a24e7da93d0e5131d49ce3cb16ddb0cfa9a',
		);
	});

	it('returns a non-object schema unchanged', () => {
		const schema = { type: 'object' as const };
		expect(reverifyInputSchema(schema)).toBe(schema);
	});
});
