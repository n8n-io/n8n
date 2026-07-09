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

/** Entity types accepted in an import `bindings` object; only these are honoured today. */
const KNOWN_BINDING_ENTITY_TYPES = ['credentials'] as const;
type KnownBindingEntityType = (typeof KNOWN_BINDING_ENTITY_TYPES)[number];

/** An import `bindings` object: known entity type → (source id → target id). */
type BindingsInput = Partial<Record<KnownBindingEntityType, Record<string, string>>>;

function isKnownBindingEntityType(key: string): key is KnownBindingEntityType {
	return KNOWN_BINDING_ENTITY_TYPES.some((known) => known === key);
}

/** A `bindings` object keyed exclusively by known entity types, each a source→target id map. */
function isBindingsObject(value: unknown): value is BindingsInput {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	return Object.entries(value).every(
		([key, entry]) => isKnownBindingEntityType(key) && isStringRecord(entry),
	);
}

const BINDINGS_ERROR_MESSAGE = `bindings must be a JSON object keyed by a supported entity type (${KNOWN_BINDING_ENTITY_TYPES.join(
	', ',
)}), e.g. {"credentials":{"<sourceId>":"<targetId>"}}`;

const bindingsSchema = z
	.string()
	.optional()
	.transform((value, ctx): BindingsInput => {
		if (value === undefined || value.trim().length === 0) return {};

		let parsed: unknown;
		try {
			parsed = JSON.parse(value);
		} catch {
			ctx.addIssue({ code: z.ZodIssueCode.custom, message: BINDINGS_ERROR_MESSAGE });
			return z.NEVER;
		}

		// Reject unknown keys explicitly — a typo like "credential" would otherwise
		// pass validation and then be silently ignored during import.
		if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
			const unknownKeys = Object.keys(parsed).filter((key) => !isKnownBindingEntityType(key));
			if (unknownKeys.length > 0) {
				const offending = unknownKeys.map((key) => `"${key}"`).join(', ');
				const supported = KNOWN_BINDING_ENTITY_TYPES.join(', ');
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `bindings contains unsupported entity type(s) ${offending}; supported: ${supported}`,
				});
				return z.NEVER;
			}
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
