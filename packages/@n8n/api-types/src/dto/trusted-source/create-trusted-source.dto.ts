import { HttpsUrl, trustedSourceConfigSchemaFor } from '@n8n/inbound-auth';
import { z } from 'zod';

import { Z } from '../../zod-class';

export const trustedSourceNameSchema = z.string().trim().min(1).max(128);
// Discovery fetches the issuer's metadata and refuses http, so the DTO refuses it up front.
export const trustedSourceIssuerSchema = HttpsUrl;
// Admin rows only: the system row has no write route.
const adminConfigSchema = trustedSourceConfigSchemaFor('admin');

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The first input key that parsing dropped, as its parent path plus the key. */
function droppedKey(
	input: unknown,
	parsed: unknown,
	path: Array<string | number> = [],
): { path: Array<string | number>; key: string } | undefined {
	if (Array.isArray(input) && Array.isArray(parsed)) {
		for (const [index, item] of input.entries()) {
			const hit = droppedKey(item, parsed[index], [...path, index]);
			if (hit) return hit;
		}
		return undefined;
	}
	if (!isRecord(input) || !isRecord(parsed)) return undefined;
	for (const key of Object.keys(input)) {
		if (!Object.hasOwn(parsed, key)) return { path, key };
		const hit = droppedKey(input[key], parsed[key], [...path, key]);
		if (hit) return hit;
	}
	return undefined;
}

// The shared schema strips unknown keys so an older process tolerates a newer document. The write
// path refuses them instead, so a misspelled setting cannot pass as its default.
export const adminTrustedSourceConfigSchema = z.unknown().transform((input, ctx) => {
	const result = adminConfigSchema.safeParse(input);
	if (!result.success) {
		for (const issue of result.error.issues) ctx.addIssue(issue);
		return z.NEVER;
	}
	const dropped = droppedKey(input, result.data);
	if (dropped) {
		ctx.addIssue({
			code: z.ZodIssueCode.unrecognized_keys,
			keys: [dropped.key],
			path: dropped.path,
			message: `Unrecognized key in object: '${dropped.key}'`,
		});
		return z.NEVER;
	}
	return result.data;
});

export class CreateTrustedSourceDto extends Z.class({
	name: trustedSourceNameSchema,
	issuer: trustedSourceIssuerSchema,
	config: adminTrustedSourceConfigSchema,
}) {}
