import { parseWithSchema, zodToJsonSchema } from '@n8n/agents';
import { describe, expect, it } from 'vitest';

import { standardApprovalResumeSchema } from '../approval-resume.schema';

describe('standardApprovalResumeSchema', () => {
	it('accepts bare approval', () => {
		expect(standardApprovalResumeSchema.parse({ approved: true })).toEqual({ approved: true });
	});

	it('accepts approve-with-comment and allow-always envelope fields', () => {
		expect(
			standardApprovalResumeSchema.parse({
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

	it('persisted JSON Schema accepts the approval envelope without stripUnknown', async () => {
		const jsonSchema = zodToJsonSchema(standardApprovalResumeSchema);
		expect(jsonSchema).not.toBeNull();

		const envelope = {
			approved: true,
			userInput: 'rename it first',
			scope: 'session' as const,
		};

		// Production resume validates the checkpointed JSON Schema. Prove the
		// real Zod→JSON Schema conversion accepts the confirm envelope as-is
		// (no stripUnknown), so HITL does not depend on AJV removeAdditional.
		const result = await parseWithSchema(jsonSchema!, envelope);
		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toEqual(envelope);

		const bare = await parseWithSchema(jsonSchema!, { approved: true });
		expect(bare.success).toBe(true);

		const extra = await parseWithSchema(jsonSchema!, { approved: true, unexpected: true });
		expect(extra.success).toBe(false);
		if (!extra.success) expect(extra.error).toContain('additional properties');
	});
});
