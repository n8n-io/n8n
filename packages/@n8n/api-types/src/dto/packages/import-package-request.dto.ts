import { z } from 'zod';

import { Z } from '../../zod-class';

/** Multipart text field names validated by {@link ImportPackageRequestDto}. */
export const IMPORT_PACKAGE_REQUEST_FORM_FIELDS = [
	'projectId',
	'folderId',
	'credentialMatchingMode',
	'credentialMissingMode',
	'bindings',
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

/** A `bindings` object keyed by entity type; each value maps source ids to target ids. */
function isBindingsObject(value: unknown): value is { credentials?: Record<string, string> } {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	return Object.values(value).every((entry) => isStringRecord(entry));
}

const BINDINGS_ERROR_MESSAGE =
	'bindings must be a JSON object keyed by entity type, e.g. {"credentials":{"<sourceId>":"<targetId>"}}';

const bindingsSchema = z
	.string()
	.optional()
	.transform((value, ctx): { credentials?: Record<string, string> } => {
		if (value === undefined || value.trim().length === 0) return {};

		let parsed: unknown;
		try {
			parsed = JSON.parse(value);
		} catch {
			ctx.addIssue({ code: z.ZodIssueCode.custom, message: BINDINGS_ERROR_MESSAGE });
			return z.NEVER;
		}

		if (!isBindingsObject(parsed)) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, message: BINDINGS_ERROR_MESSAGE });
			return z.NEVER;
		}

		return parsed;
	});

export class ImportPackageRequestDto extends Z.class({
	projectId: optionalFormId,
	folderId: optionalFormId,
	credentialMatchingMode: z
		.enum(['id-only', 'name-and-type', 'type-only'])
		.optional()
		.default('id-only'),
	credentialMissingMode: z.enum(['must-preexist', 'create-stub']).optional().default('create-stub'),
	bindings: bindingsSchema,
	workflowConflictPolicy: z.enum(['new-version', 'fail', 'skip']),
	workflowPublishingPolicy: z
		.enum(['preserve-published-state', 'match-source', 'publish-all', 'unpublish-all'])
		.optional()
		.default('preserve-published-state'),
	workflowIdPolicy: z.enum(['new', 'source']).optional().default('new'),
}) {}
