import { evaluateGoalExpression, toJsonContext, toSlotValue } from '../expressions';

describe('evaluateGoalExpression', () => {
	it('evaluates expressions against $state', () => {
		expect(evaluateGoalExpression('={{ $state.count + 1 }}', { state: { count: 41 } })).toBe(42);
		expect(evaluateGoalExpression('={{ $state.email }}', { state: { email: 'a@b.co' } })).toBe(
			'a@b.co',
		);
	});

	it('evaluates boolean conditions', () => {
		expect(evaluateGoalExpression('={{ $state.id !== null }}', { state: { id: 'SF-1' } })).toBe(
			true,
		);
		expect(evaluateGoalExpression('={{ $state.id !== null }}', { state: { id: null } })).toBe(
			false,
		);
	});

	it('exposes the tool output as $json', () => {
		expect(
			evaluateGoalExpression('={{ $json.customer.id }}', {
				state: {},
				json: { customer: { id: 'SF-9' } },
			}),
		).toBe('SF-9');
	});

	it('accepts expressions without the leading =', () => {
		expect(evaluateGoalExpression('{{ $state.x }}', { state: { x: 7 } })).toBe(7);
	});

	it('fails soft to undefined on invalid expressions', () => {
		expect(evaluateGoalExpression('={{ not ( valid ]] }}', { state: {} })).toBeUndefined();
	});
});

describe('toSlotValue', () => {
	it('passes JSON values through', () => {
		expect(toSlotValue('x')).toBe('x');
		expect(toSlotValue(3)).toBe(3);
		expect(toSlotValue({ a: [1, 2] })).toEqual({ a: [1, 2] });
	});

	it('normalizes undefined to null', () => {
		expect(toSlotValue(undefined)).toBeNull();
	});

	it('drops non-serializable values', () => {
		const cyclic: Record<string, unknown> = {};
		cyclic.self = cyclic;
		expect(toSlotValue(cyclic)).toBeNull();
	});
});

describe('toJsonContext', () => {
	it('uses object outputs as-is', () => {
		expect(toJsonContext({ id: 'SF-1' })).toEqual({ id: 'SF-1' });
	});

	it('parses JSON-string tool output so $json.field resolves', () => {
		// Tools commonly return JSON strings (e.g. `return JSON.stringify({...})`).
		expect(toJsonContext('{"id":100500}')).toEqual({ id: 100500 });
		expect(toJsonContext('{ "id": 100500, "plan": "trial" }')).toEqual({
			id: 100500,
			plan: 'trial',
		});
	});

	it('unwraps n8n item arrays and { json } envelopes', () => {
		expect(toJsonContext([{ json: { id: 'SF-1' } }])).toEqual({ id: 'SF-1' });
		expect(toJsonContext([{ id: 'SF-2' }])).toEqual({ id: 'SF-2' });
		expect(toJsonContext({ json: { id: 'SF-3' } })).toEqual({ id: 'SF-3' });
	});

	it('unwraps the workflow-tool execution envelope to the last output row', () => {
		// Shape returned by a sub-workflow tool, so $json.id resolves.
		expect(
			toJsonContext({
				executionId: '5991',
				status: 'success',
				data: { 'Edit Fields': [{ id: '100500' }] },
			}),
		).toEqual({ id: '100500' });
	});

	it('wraps non-JSON strings and primitives under value', () => {
		expect(toJsonContext('done')).toEqual({ value: 'done' });
		expect(toJsonContext(42)).toEqual({ value: 42 });
	});
});
