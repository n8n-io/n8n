import { WorkflowPublishForbiddenErrorPublicDto } from '../workflow-publish-forbidden-error-public.dto';

describe('WorkflowPublishForbiddenErrorPublicDto', () => {
	// A scope mismatch on any other route sends the same 403 with a message and nothing else.
	test('accepts a message-only body', () => {
		const result = WorkflowPublishForbiddenErrorPublicDto.safeParse({
			message: 'Forbidden',
		});

		expect(result.success).toBe(true);
	});

	test.each(['insufficient_api_key_scope', 'insufficient_permissions'])(
		'accepts the publish-refused shape with reason %s',
		(reason) => {
			const result = WorkflowPublishForbiddenErrorPublicDto.safeParse({
				message: 'Your change was saved as a draft.',
				reason,
				versionId: 'version-1',
			});

			expect(result.success).toBe(true);
		},
	);

	test('rejects a missing message', () => {
		const result = WorkflowPublishForbiddenErrorPublicDto.safeParse({
			reason: 'insufficient_permissions',
			versionId: 'version-1',
		});

		expect(result.success).toBe(false);
	});
});
