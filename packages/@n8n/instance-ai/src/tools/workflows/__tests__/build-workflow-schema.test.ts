import { buildWorkflowInputSchema } from '../build-workflow.tool';

describe('buildWorkflowInputSchema.patches coercion', () => {
	const patch = { old_str: 'foo', new_str: 'bar' };

	it('accepts a native array of patches', () => {
		const parsed = buildWorkflowInputSchema.parse({ patches: [patch] });
		expect(parsed.patches).toEqual([patch]);
	});

	it('accepts a JSON-stringified array of patches', () => {
		const parsed = buildWorkflowInputSchema.parse({ patches: JSON.stringify([patch]) });
		expect(parsed.patches).toEqual([patch]);
	});

	it('rejects a non-JSON string with a helpful array-expected error', () => {
		const result = buildWorkflowInputSchema.safeParse({ patches: 'not-json' });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].path).toEqual(['patches']);
		}
	});

	it('rejects a stringified object (not an array)', () => {
		const result = buildWorkflowInputSchema.safeParse({ patches: JSON.stringify(patch) });
		expect(result.success).toBe(false);
	});

	it('leaves patches undefined when not provided', () => {
		const parsed = buildWorkflowInputSchema.parse({});
		expect(parsed.patches).toBeUndefined();
	});
});
