import { z } from 'zod';

import { Z } from '../../zod-class';

/** Multipart text field names validated by {@link ImportPackageRequestDto}. */
export const IMPORT_PACKAGE_REQUEST_FORM_FIELDS = [
	'projectId',
	'folderId',
	'credentialMatchingMode',
	'credentialMissingMode',
	'credentialBindings',
	'workflowConflictPolicy',
	'workflowPublishingPolicy',
	'workflowIdPolicy',
] as const;

/** Multipart text fields: empty / whitespace-only values become `undefined`. */
const optionalFormId = z
	.string()
	.optional()
	.transform((value) => {
		if (value === undefined) return undefined;
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : undefined;
	});

function isStringRecord(value: unknown): value is Record<string, string> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	return Object.entries(value).every(
		([sourceId, targetId]) =>
			sourceId.length > 0 && typeof targetId === 'string' && targetId.length > 0,
	);
}

const credentialBindingsSchema = z
	.string()
	.optional()
	.transform((value, ctx) => {
		if (value === undefined || value.trim().length === 0) return {};

		let parsed: unknown;
		try {
			parsed = JSON.parse(value);
		} catch {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					'credentialBindings must be a JSON object mapping source credential ids to target credential ids',
			});
			return z.NEVER;
		}

		if (!isStringRecord(parsed)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					'credentialBindings must be a JSON object mapping source credential ids to target credential ids',
			});
			return z.NEVER;
		}

		return parsed;
	});

export class ImportPackageRequestDto extends Z.class({
	projectId: optionalFormId,
	folderId: optionalFormId,
	credentialMatchingMode: z.enum(['id-only']).optional().default('id-only'),
	credentialMissingMode: z.enum(['must-preexist', 'create-stub']).optional().default('create-stub'),
	credentialBindings: credentialBindingsSchema,
	workflowConflictPolicy: z.enum(['new-version', 'fail', 'skip']),
	workflowPublishingPolicy: z
		.enum(['preserve-published-state', 'match-source', 'publish-all', 'unpublish-all'])
		.optional()
		.default('preserve-published-state'),
	workflowIdPolicy: z.enum(['new', 'source']).optional().default('new'),
}) {}
