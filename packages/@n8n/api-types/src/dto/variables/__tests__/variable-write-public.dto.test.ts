import { CreateVariablePublicDto, UpdateVariablePublicDto } from '../variable-write-public.dto';

const validPayload = { key: 'myKey', value: 'myValue' };

describe.each([
	['CreateVariablePublicDto', CreateVariablePublicDto],
	['UpdateVariablePublicDto', UpdateVariablePublicDto],
])('%s', (_label, Dto) => {
	test('accepts a key and a value', () => {
		expect(Dto.safeParse(validPayload).success).toBe(true);
	});

	test.each(['key', 'value'] as const)('rejects a payload with no %s', (field) => {
		const { [field]: _omitted, ...payload } = validPayload;

		expect(Dto.safeParse(payload).success).toBe(false);
	});

	test('rejects an unknown key through both the DTO and its schema', () => {
		const payload = { ...validPayload, notAVariableField: 'x' };

		expect(Dto.safeParse(payload).success).toBe(false);
		expect(Dto.schema.safeParse(payload).success).toBe(false);
	});

	test.each(['id', 'type'])('reports %s as read-only', (field) => {
		const result = Dto.safeParse({ ...validPayload, [field]: 'string' });

		expect(result.success).toBe(false);
		expect(result.error?.errors[0]).toEqual(
			expect.objectContaining({ path: [field], message: 'is read-only' }),
		);
	});

	test('rejects a value above the maximum length', () => {
		expect(Dto.safeParse({ ...validPayload, value: 'x'.repeat(1001) }).success).toBe(false);
	});

	test('rejects a projectId above the maximum length', () => {
		expect(Dto.safeParse({ ...validPayload, projectId: 'x'.repeat(37) }).success).toBe(false);
	});
});

describe('CreateVariablePublicDto', () => {
	test('rejects a null projectId', () => {
		expect(CreateVariablePublicDto.safeParse({ ...validPayload, projectId: null }).success).toBe(
			false,
		);
	});

	test('rejects a key that starts with a digit', () => {
		expect(CreateVariablePublicDto.safeParse({ ...validPayload, key: '1key' }).success).toBe(false);
	});
});

describe('UpdateVariablePublicDto', () => {
	test('accepts a null projectId, which moves the variable to the global scope', () => {
		expect(UpdateVariablePublicDto.safeParse({ ...validPayload, projectId: null }).success).toBe(
			true,
		);
	});

	// A variable created before the stricter create rule may carry such a key.
	test('accepts a key that starts with a digit', () => {
		expect(UpdateVariablePublicDto.safeParse({ ...validPayload, key: '1key' }).success).toBe(true);
	});
});
