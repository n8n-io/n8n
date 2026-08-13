import { jsonParse } from 'n8n-workflow';

import { instanceRegistrationSchema, type InstanceRegistration } from '../instance-registry-types';

const validV1: InstanceRegistration = {
	schemaVersion: 1,
	instanceKey: 'abc-123_DEF',
	hostId: 'main-host-1',
	instanceType: 'main',
	instanceRole: 'leader',
	version: '1.84.0',
	registeredAt: 1_700_000_000_000,
	lastSeen: 1_700_000_030_000,
};

describe('instanceRegistrationSchema', () => {
	describe('valid payloads', () => {
		test('accepts a fully populated V1 payload', () => {
			const parsed = instanceRegistrationSchema.parse(validV1);

			expect(parsed).toEqual(validV1);
		});

		test.each([
			['main', 'leader'],
			['main', 'follower'],
			['main', 'unset'],
			['worker', 'unset'],
			['webhook', 'unset'],
		] as const)('accepts instanceType=%s with instanceRole=%s', (instanceType, instanceRole) => {
			const parsed = instanceRegistrationSchema.parse({
				...validV1,
				instanceType,
				instanceRole,
			});

			expect(parsed.instanceType).toBe(instanceType);
			expect(parsed.instanceRole).toBe(instanceRole);
		});

		test.each([
			'abc',
			'abc-123',
			'abc_123',
			'ABC-123_def',
			'a',
			'1',
			'0123456789abcdef-0123-4567-89ab-cdef01234567',
		])('accepts instanceKey=%s', (instanceKey) => {
			expect(() => instanceRegistrationSchema.parse({ ...validV1, instanceKey })).not.toThrow();
		});
	});

	describe('passthrough', () => {
		test('preserves unknown fields on parse output', () => {
			const withExtras = {
				...validV1,
				futureField: 'hello',
				nested: { version: 2 },
			};

			const parsed = instanceRegistrationSchema.parse(withExtras) as typeof withExtras;

			expect(parsed.futureField).toBe('hello');
			expect(parsed.nested).toEqual({ version: 2 });
		});
	});

	describe('invalid discriminator', () => {
		test('rejects unsupported schemaVersion', () => {
			expect(() => instanceRegistrationSchema.parse({ ...validV1, schemaVersion: 2 })).toThrow();
		});

		test('rejects missing schemaVersion', () => {
			const { schemaVersion: _ignored, ...rest } = validV1;

			expect(() => instanceRegistrationSchema.parse(rest)).toThrow();
		});

		test('rejects non-numeric schemaVersion', () => {
			expect(() => instanceRegistrationSchema.parse({ ...validV1, schemaVersion: '1' })).toThrow();
		});
	});

	describe('invalid instanceKey', () => {
		test.each([
			['empty string', ''],
			['contains space', 'abc 123'],
			['contains dot', 'abc.123'],
			['contains colon', 'abc:123'],
			['contains slash', 'abc/123'],
			['contains unicode', 'αβγ'],
		])('rejects instanceKey when %s', (_label, instanceKey) => {
			expect(() => instanceRegistrationSchema.parse({ ...validV1, instanceKey })).toThrow();
		});
	});

	describe('invalid enums', () => {
		test.each(['coordinator', 'unknown', ''])('rejects instanceType=%s', (instanceType) => {
			expect(() => instanceRegistrationSchema.parse({ ...validV1, instanceType })).toThrow();
		});

		test.each(['primary', 'secondary', ''])('rejects instanceRole=%s', (instanceRole) => {
			expect(() => instanceRegistrationSchema.parse({ ...validV1, instanceRole })).toThrow();
		});
	});

	describe('missing required fields', () => {
		test.each([
			'instanceKey',
			'hostId',
			'instanceType',
			'instanceRole',
			'version',
			'registeredAt',
			'lastSeen',
		] as const)('rejects payload missing %s', (field) => {
			const { [field]: _ignored, ...rest } = validV1;

			expect(() => instanceRegistrationSchema.parse(rest)).toThrow();
		});
	});

	describe('non-numeric timestamps', () => {
		test.each(['registeredAt', 'lastSeen'] as const)('rejects string %s', (field) => {
			expect(() =>
				instanceRegistrationSchema.parse({ ...validV1, [field]: 'not-a-number' }),
			).toThrow();
		});
	});

	describe('serialization roundtrip', () => {
		test('JSON roundtrip yields deep-equal payload', () => {
			const serialized = JSON.stringify(validV1);
			const parsed = instanceRegistrationSchema.parse(jsonParse(serialized));

			expect(parsed).toEqual(validV1);
		});

		test('JSON roundtrip preserves passthrough fields', () => {
			const withExtras = { ...validV1, futureField: 'hello' };
			const serialized = JSON.stringify(withExtras);

			const parsed = instanceRegistrationSchema.parse(jsonParse(serialized)) as typeof withExtras;

			expect(parsed.futureField).toBe('hello');
		});
	});
});
