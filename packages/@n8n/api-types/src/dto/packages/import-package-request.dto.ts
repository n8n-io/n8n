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
	'missingNodeTypeMode',
	'projectConflictPolicy',
	'folderConflictPolicy',
	'dataTableMatchingMode',
	'dataTableMissingMode',
	'dataTableSchemaConflictPolicy',
	'variableMissingMode',
	'variableConflictPolicy',
	'variableParentPolicy',
	'tagMissingMode',
	'tagConflictPolicy',
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

/**
 * Optional enum for multipart text fields. A blank ("" / whitespace-only) value —
 * how an omitted multipart field arrives — is coerced to `undefined` before the
 * enum runs, so it falls back to `defaultValue` instead of being rejected.
 */
const optionalEnum = <const T extends [string, ...string[]]>(values: T, defaultValue: T[number]) =>
	z.preprocess(
		(value) => (typeof value === 'string' && value.trim().length === 0 ? undefined : value),
		z.enum(values).optional().default(defaultValue),
	);

/**
 * Like {@link optionalEnum} but without a default, so an omitted field arrives as `undefined`
 * and stays tellable from an explicit value — for fields only some requests may carry.
 */
const optionalEnumNoDefault = <const T extends [string, ...string[]]>(values: T) =>
	z.preprocess(
		(value) => (typeof value === 'string' && value.trim().length === 0 ? undefined : value),
		z.enum(values).optional(),
	);

const BINDINGS_ERROR_MESSAGE =
	'bindings must be a JSON object, e.g. {"credentials":{"<sourceId>":"<targetId>"}}';

const bindingMapSchema = z.record(z.string().min(1), z.string().min(1));
const bindingsObjectSchema = z.object({ credentials: bindingMapSchema }).partial().strict();

type BindingsInput = z.infer<typeof bindingsObjectSchema>;

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

		const result = bindingsObjectSchema.safeParse(parsed);
		if (!result.success) {
			for (const issue of result.error.issues) {
				ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue.message, path: issue.path });
			}
			return z.NEVER;
		}

		return result.data;
	});

export class ImportPackageRequestDto extends Z.class({
	projectId: optionalFormId,
	folderId: optionalFormId,
	credentialMatchingMode: optionalEnum(['id-only', 'name-and-type', 'type-only'], 'id-only'),
	credentialMissingMode: optionalEnum(['must-preexist', 'create-stub'], 'create-stub'),
	bindings: bindingsSchema,
	workflowConflictPolicy: optionalEnum(['new-version', 'fail', 'skip'], 'new-version'),
	workflowPublishingPolicy: optionalEnum(
		['preserve-published-state', 'match-source', 'publish-all', 'unpublish-all'],
		'preserve-published-state',
	),
	workflowIdPolicy: optionalEnum(['new', 'source'], 'source'),
	missingNodeTypeMode: optionalEnum(['fail', 'import-anyway'], 'fail'),
	projectConflictPolicy: optionalEnum(['merge', 'fail', 'overwrite'], 'merge'),
	folderConflictPolicy: optionalEnum(['merge', 'fail'], 'merge'),
	dataTableMatchingMode: optionalEnum(['by-id'], 'by-id'),
	dataTableMissingMode: optionalEnum(['create', 'must-preexist', 'do-nothing'], 'create'),
	dataTableSchemaConflictPolicy: optionalEnum(['keep-existing', 'fail'], 'keep-existing'),
	variableMissingMode: optionalEnum(
		['do-nothing', 'must-preexist', 'create-stub', 'create-with-value'],
		'create-with-value',
	),
	variableConflictPolicy: optionalEnum(['keep-existing', 'overwrite', 'fail'], 'keep-existing'),
	variableParentPolicy: optionalEnumNoDefault(['project', 'global']),
	tagMissingMode: optionalEnum(['create', 'do-nothing'], 'create'),
	tagConflictPolicy: optionalEnum(['skip', 'fail', 'rename'], 'skip'),
}) {}
