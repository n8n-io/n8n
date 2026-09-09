import { appBindingSchema, appBindingsSchema, type DescribedBinding } from '../app-binding.schema';

const binding = (key: string) => ({ key, kind: 'workflow', workflowId: 'wf-1' });

describe('app-binding.schema', () => {
	describe('appBindingSchema', () => {
		test.each([
			{ name: 'single letter', key: 'a', expected: true },
			{ name: 'slug with digits and hyphens', key: 'submit-order-2', expected: true },
			{ name: '64 characters', key: `a${'b'.repeat(63)}`, expected: true },
			{ name: '65 characters', key: `a${'b'.repeat(64)}`, expected: false },
			{ name: 'empty', key: '', expected: false },
			{ name: 'leading digit', key: '1abc', expected: false },
			{ name: 'leading hyphen', key: '-abc', expected: false },
			{ name: 'uppercase', key: 'Submit', expected: false },
			{ name: 'underscore', key: 'submit_order', expected: false },
			{ name: 'slash', key: 'a/b', expected: false },
		])('key: $name', ({ key, expected }) => {
			expect(appBindingSchema.safeParse(binding(key)).success).toBe(expected);
		});

		it('rejects an unknown kind', () => {
			expect(
				appBindingSchema.safeParse({ key: 'orders', kind: 'dataTable', dataTableId: 'dt-1' })
					.success,
			).toBe(false);
		});

		it('rejects a missing or oversized workflowId', () => {
			expect(appBindingSchema.safeParse({ key: 'a', kind: 'workflow' }).success).toBe(false);
			expect(
				appBindingSchema.safeParse({ key: 'a', kind: 'workflow', workflowId: 'x'.repeat(37) })
					.success,
			).toBe(false);
		});
	});

	describe('appBindingsSchema', () => {
		it('accepts an empty list', () => {
			expect(appBindingsSchema.safeParse([]).success).toBe(true);
		});

		it('rejects duplicate keys', () => {
			const result = appBindingsSchema.safeParse([binding('submit'), binding('submit')]);
			expect(result.success).toBe(false);
			expect(!result.success && result.error.issues[0].message).toBe(
				'Binding keys must be unique.',
			);
		});

		it('accepts 50 bindings and rejects 51', () => {
			const fifty = Array.from({ length: 50 }, (_, i) => binding(`k${i}`));
			expect(appBindingsSchema.safeParse(fifty).success).toBe(true);
			expect(appBindingsSchema.safeParse([...fifty, binding('k50')]).success).toBe(false);
		});
	});

	describe('DescribedBinding', () => {
		it('carries typed output with its source, or unknown output', () => {
			const typed: DescribedBinding = {
				key: 'submit',
				kind: 'workflow',
				workflowId: 'wf-1',
				name: 'Echo',
				published: true,
				input: 'passthrough',
				output: [{ name: 'reply', type: 'string', nullable: false, optional: false }],
				outputSource: { kind: 'execution', executionId: '7', at: '2026-09-09T00:00:00.000Z' },
			};
			const untyped: DescribedBinding = {
				...typed,
				output: 'unknown',
				outputSource: { kind: 'unknown' },
			};
			expect(typed.outputSource.kind).toBe('execution');
			expect(untyped.output).toBe('unknown');
		});
	});
});
