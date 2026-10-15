import { describe, expect, it } from 'vitest';

import { instanceAiApprovalResumeSchema } from '../instance-ai.schema';

describe('instanceAiApprovalResumeSchema', () => {
	it('accepts bare approval', () => {
		expect(instanceAiApprovalResumeSchema.parse({ approved: true })).toEqual({ approved: true });
	});

	it('accepts approve-with-comment and allow-always envelope fields', () => {
		expect(
			instanceAiApprovalResumeSchema.parse({
				approved: true,
				userInput: 'rename it first',
				scope: 'session',
			}),
		).toEqual({
			approved: true,
			userInput: 'rename it first',
			scope: 'session',
		});
	});
});
