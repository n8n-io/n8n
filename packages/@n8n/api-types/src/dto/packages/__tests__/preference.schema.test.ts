import { serializedPreferenceSchema } from '../preference.schema';

describe('serializedPreferenceSchema', () => {
	const preference = {
		id: '09c33210-d8be-43a8-859f-1fec0501c035',
		scope: 'project',
		content: 'Use clear node names.',
	};

	it.each(['project', 'instance'])('accepts the %s scope', (scope) => {
		expect(serializedPreferenceSchema.parse({ ...preference, scope })).toEqual({
			...preference,
			scope,
		});
	});

	it('refuses personal scope', () => {
		expect(serializedPreferenceSchema.safeParse({ ...preference, scope: 'user' }).success).toBe(
			false,
		);
	});

	it.each(['source', 'createdById', 'userId', 'projectId', 'createdAt', 'updatedAt'])(
		'refuses destination-local metadata: %s',
		(field) => {
			expect(
				serializedPreferenceSchema.safeParse({ ...preference, [field]: 'local' }).success,
			).toBe(false);
		},
	);

	it.each(['', '   ', 'x'.repeat(2001)])('refuses invalid content', (content) => {
		expect(serializedPreferenceSchema.safeParse({ ...preference, content }).success).toBe(false);
	});

	it('refuses an invalid identity', () => {
		expect(serializedPreferenceSchema.safeParse({ ...preference, id: 'invalid' }).success).toBe(
			false,
		);
	});
});
