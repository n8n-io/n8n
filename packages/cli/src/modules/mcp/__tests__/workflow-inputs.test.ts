import { workflowInputsSchema } from '../tools/workflow-inputs';

describe('workflowInputsSchema', () => {
	test('accepts a single chat, form, or webhook payload', () => {
		expect(workflowInputsSchema.parse({ chatInput: 'hi' })).toEqual({ chatInput: 'hi' });
		expect(workflowInputsSchema.parse({ formData: { email: 'a@b.c' } })).toEqual({
			formData: { email: 'a@b.c' },
		});
		expect(workflowInputsSchema.parse({ webhookData: { body: { x: 1 } } })).toEqual({
			webhookData: { method: 'GET', body: { x: 1 } },
		});
	});

	test('accepts a sub-workflow payload, also with no fields', () => {
		expect(workflowInputsSchema.parse({ workflowInputs: { customerId: 1 } })).toEqual({
			workflowInputs: { customerId: 1 },
		});
		expect(workflowInputsSchema.parse({ workflowInputs: {} })).toEqual({ workflowInputs: {} });
	});

	test('rejects a sub-workflow payload next to another payload key', () => {
		expect(workflowInputsSchema.safeParse({ workflowInputs: {}, chatInput: 'hi' }).success).toBe(
			false,
		);
	});

	test('rejects leftover type', () => {
		expect(workflowInputsSchema.safeParse({ type: 'chat' }).success).toBe(false);
		expect(workflowInputsSchema.safeParse({ type: 'chat', chatInput: 'hi' }).success).toBe(false);
	});

	test('rejects overlapping payload keys instead of keeping the first match', () => {
		expect(
			workflowInputsSchema.safeParse({
				chatInput: 'hi',
				webhookData: { body: { x: 1 } },
			}).success,
		).toBe(false);
		expect(
			workflowInputsSchema.safeParse({
				chatInput: 'hi',
				formData: { email: 'a@b.c' },
			}).success,
		).toBe(false);
		expect(
			workflowInputsSchema.safeParse({
				formData: { email: 'a@b.c' },
				webhookData: { body: { x: 1 } },
			}).success,
		).toBe(false);
	});

	test('rejects unknown extra keys', () => {
		expect(workflowInputsSchema.safeParse({ chatInput: 'hi', extra: true }).success).toBe(false);
	});

	test('rejects unknown keys inside webhookData instead of dropping them', () => {
		// A misspelled field used to be stripped, leaving body undefined. The webhook
		// then ran with an empty body and the caller was told the execution started.
		expect(
			workflowInputsSchema.safeParse({ webhookData: { method: 'POST', bdy: { x: 1 } } }).success,
		).toBe(false);
		expect(
			workflowInputsSchema.safeParse({ webhookData: { body: { x: 1 }, headerz: { a: 'b' } } })
				.success,
		).toBe(false);
	});
});
