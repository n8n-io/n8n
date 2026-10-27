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

	test('rejects a field of the wrong type', () => {
		const result = PublishWorkflowPublicDto.safeParse({ versionId: 123 });

		expect(result.success).toBe(false);
	});
});
