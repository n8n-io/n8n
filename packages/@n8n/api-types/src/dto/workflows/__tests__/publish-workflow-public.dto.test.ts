import { PublishWorkflowPublicDto } from '../publish-workflow-public.dto';

describe('PublishWorkflowPublicDto', () => {
	test('accepts an empty body', () => {
		const result = PublishWorkflowPublicDto.safeParse({});

		expect(result.success).toBe(true);
	});

	test('accepts every field together', () => {
		const result = PublishWorkflowPublicDto.safeParse({
			versionId: 'version-1',
			name: 'Release 3',
			description: 'Ships the new webhook',
		});

		expect(result.success).toBe(true);
	});

	test.each(['versionId', 'name', 'description'])('accepts %s on its own', (field) => {
		const result = PublishWorkflowPublicDto.safeParse({ [field]: 'value' });

		expect(result.success).toBe(true);
	});

	test.each(['versionId', 'name', 'description'])('rejects a non-string %s', (field) => {
		const result = PublishWorkflowPublicDto.safeParse({ [field]: 123 });

		expect(result.success).toBe(false);
	});

	// Guards the deliberate absence of `.strict()`: the spec this replaced allowed unknown keys.
	test('accepts an unknown key', () => {
		const result = PublishWorkflowPublicDto.safeParse({ versionId: 'version-1', bogus: true });

		expect(result.success).toBe(true);
	});

	test('rejects a body that is not an object', () => {
		expect(PublishWorkflowPublicDto.safeParse('version-1').success).toBe(false);
		expect(PublishWorkflowPublicDto.safeParse([]).success).toBe(false);
	});
});
