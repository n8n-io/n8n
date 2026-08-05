/**
 * Approval confirmations attach envelope-level fields (`userInput` free-text
 * commentary, `scope`) to the resume payload alongside the tool's own resume
 * fields. Tool resume schemas declare only their own fields, and a SUSPENDED
 * resume validates against the schema serialized to JSON Schema — where
 * `additionalProperties: false` rejects the envelope fields outright, leaving
 * the run suspended forever. (A live resume validates against the zod object,
 * which strips unknown keys, so the same payload passes there.)
 *
 * These tests pin the fallback that restores parity: on validation failure the
 * runtime retries without the envelope fields.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { parseWithSchema } from '../../utils/parse';
import { zodToJsonSchema } from '../../utils/zod';
import { withoutApprovalEnvelopeFields } from '../loop/agent-runtime';

describe('withoutApprovalEnvelopeFields', () => {
	it('strips userInput and scope, preserving the tool fields', () => {
		expect(
			withoutApprovalEnvelopeFields({
				approved: true,
				userInput: 'Yes, publish it with the credential attached as is.',
				scope: 'always',
			}),
		).toEqual({ approved: true });
	});

	it('strips one envelope field without touching other keys', () => {
		expect(
			withoutApprovalEnvelopeFields({ approved: true, action: 'apply', userInput: 'go ahead' }),
		).toEqual({ approved: true, action: 'apply' });
	});

	it('returns undefined when no envelope field is present (nothing to retry)', () => {
		expect(withoutApprovalEnvelopeFields({ approved: false })).toBeUndefined();
	});

	it('returns undefined for non-object payloads', () => {
		expect(withoutApprovalEnvelopeFields(undefined)).toBeUndefined();
		expect(withoutApprovalEnvelopeFields('approve')).toBeUndefined();
		expect(withoutApprovalEnvelopeFields([{ approved: true }])).toBeUndefined();
	});

	it('does not mutate the original payload', () => {
		const original = { approved: true, userInput: 'ok' };
		withoutApprovalEnvelopeFields(original);
		expect(original).toEqual({ approved: true, userInput: 'ok' });
	});
});

describe('suspended-resume validation parity', () => {
	// The shape every tool resume schema shares, serialized exactly the way a
	// suspended tool call persists it (zod object → JSON Schema with
	// additionalProperties: false).
	const approvalResumeJsonSchema = zodToJsonSchema(z.object({ approved: z.boolean() }));
	if (!approvalResumeJsonSchema) throw new Error('failed to serialize the resume schema');

	it('rejects an approval carrying commentary against the serialized schema', async () => {
		const result = await parseWithSchema(approvalResumeJsonSchema, {
			approved: true,
			userInput: 'Yes, publish it.',
		});
		expect(result.success).toBe(false);
	});

	it('accepts the same approval once the envelope fields are stripped', async () => {
		const stripped = withoutApprovalEnvelopeFields({
			approved: true,
			userInput: 'Yes, publish it.',
			scope: 'always',
		});
		expect(stripped).toBeDefined();
		const result = await parseWithSchema(approvalResumeJsonSchema, stripped);
		expect(result).toEqual({ success: true, data: { approved: true } });
	});
});
