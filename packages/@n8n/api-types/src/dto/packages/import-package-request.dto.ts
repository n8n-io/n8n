import { z } from 'zod';

import {
	importPackageRequestFieldDocs,
	importPackageSelectionRequestFieldDocs,
} from './import-package-request.openapi';
import { publicApiUploadedFileSchema } from '../../schemas/public-api-uploaded-file.schema';
import { Z } from '../../zod-class';

const packageFileSchema = publicApiUploadedFileSchema.openapi(
	importPackageRequestFieldDocs.package,
);

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
	'overwriteDeletionPolicy',
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

export class ImportPackageRequestDto extends Z.class(
	{
		package: packageFileSchema,
		projectId: optionalFormId.openapi(importPackageRequestFieldDocs.projectId),
		folderId: optionalFormId.openapi(importPackageRequestFieldDocs.folderId),
		credentialMatchingMode: optionalEnum(
			['id-only', 'name-and-type', 'type-only'],
			'id-only',
		).openapi(importPackageRequestFieldDocs.credentialMatchingMode),
		credentialMissingMode: optionalEnum(['must-preexist', 'create-stub'], 'create-stub').openapi(
			importPackageRequestFieldDocs.credentialMissingMode,
		),
		bindings: bindingsSchema.openapi(importPackageRequestFieldDocs.bindings),
		// Required (unlike every other mode/policy field here), matching the legacy handler, which
		// required it even though this schema alone would otherwise default it to `new-version`.
		workflowConflictPolicy: z
			.enum(['new-version', 'fail', 'skip'])
			.openapi(importPackageRequestFieldDocs.workflowConflictPolicy),
		workflowPublishingPolicy: optionalEnum(
			['preserve-published-state', 'match-source', 'publish-all', 'unpublish-all'],
			'preserve-published-state',
		).openapi(importPackageRequestFieldDocs.workflowPublishingPolicy),
		workflowIdPolicy: optionalEnum(['new', 'source'], 'source').openapi(
			importPackageRequestFieldDocs.workflowIdPolicy,
		),
		missingNodeTypeMode: optionalEnum(['fail', 'import-anyway'], 'fail').openapi(
			importPackageRequestFieldDocs.missingNodeTypeMode,
		),
		projectConflictPolicy: optionalEnum(['merge', 'fail', 'overwrite'], 'merge').openapi(
			importPackageRequestFieldDocs.projectConflictPolicy,
		),
		folderConflictPolicy: optionalEnumNoDefault(['merge', 'fail', 'overwrite']).openapi(
			importPackageRequestFieldDocs.folderConflictPolicy,
		),
		overwriteDeletionPolicy: optionalEnum(['archive', 'hard-delete'], 'archive').openapi(
			importPackageRequestFieldDocs.overwriteDeletionPolicy,
		),
		dataTableMatchingMode: optionalEnum(['by-id'], 'by-id').openapi(
			importPackageRequestFieldDocs.dataTableMatchingMode,
		),
		dataTableMissingMode: optionalEnum(['create', 'must-preexist', 'do-nothing'], 'create').openapi(
			importPackageRequestFieldDocs.dataTableMissingMode,
		),
		dataTableSchemaConflictPolicy: optionalEnum(
			['keep-existing', 'fail', 'overwrite', 'overwrite-non-destructive'],
			'keep-existing',
		).openapi(importPackageRequestFieldDocs.dataTableSchemaConflictPolicy),
		variableMissingMode: optionalEnum(
			['do-nothing', 'must-preexist', 'create-stub', 'create-with-value'],
			'create-with-value',
		).openapi(importPackageRequestFieldDocs.variableMissingMode),
		variableConflictPolicy: optionalEnum(
			['keep-existing', 'overwrite', 'fail'],
			'keep-existing',
		).openapi(importPackageRequestFieldDocs.variableConflictPolicy),
		variableParentPolicy: optionalEnumNoDefault(['project', 'global']).openapi(
			importPackageRequestFieldDocs.variableParentPolicy,
		),
		tagMissingMode: optionalEnum(['create', 'do-nothing'], 'create').openapi(
			importPackageRequestFieldDocs.tagMissingMode,
		),
		tagConflictPolicy: optionalEnum(['skip', 'fail', 'rename'], 'skip').openapi(
			importPackageRequestFieldDocs.tagConflictPolicy,
		),
	},
	{ strict: true },
) {}

/** Multipart text field names validated by {@link ImportPackageSelectionRequestDto}. */
export const IMPORT_PACKAGE_SELECTION_REQUEST_FORM_FIELDS = [
	'selectedProjectId',
	'selectedWorkflowIds',
	'deletedWorkflowIds',
	'workflowConflictPolicy',
	'workflowIdPolicy',
	'overwriteDeletionPolicy',
] as const;

const SELECTED_WORKFLOW_IDS_ERROR_MESSAGE =
	'selectedWorkflowIds must be a JSON array of non-empty strings, e.g. ["id1","id2"]';
const DELETED_WORKFLOW_IDS_ERROR_MESSAGE =
	'deletedWorkflowIds must be a JSON array of non-empty strings, e.g. ["id1","id2"]';

const idArraySchema = z.array(z.string().trim().min(1));

function parseIdArray(value: string, ctx: z.RefinementCtx, errorMessage: string): string[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(value);
	} catch {
		ctx.addIssue({ code: z.ZodIssueCode.custom, message: errorMessage });
		return z.NEVER;
	}

	const result = idArraySchema.safeParse(parsed);
	if (!result.success) {
		ctx.addIssue({ code: z.ZodIssueCode.custom, message: errorMessage });
		return z.NEVER;
	}

	return result.data;
}

/** Multipart fields carry arrays as JSON text. Reject a blank value, but accept `[]`. */
const requiredJsonStringIdArray = (errorMessage: string) =>
	z.string().transform((value, ctx): string[] => {
		if (value.trim().length === 0) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, message: errorMessage });
			return z.NEVER;
		}
		return parseIdArray(value, ctx, errorMessage);
	});

/** Treat blank or omitted fields as `undefined`. */
const optionalJsonStringIdArray = (errorMessage: string) =>
	z
		.string()
		.optional()
		.transform((value, ctx): string[] | undefined => {
			if (value === undefined || value.trim().length === 0) return undefined;
			return parseIdArray(value, ctx, errorMessage);
		});

export class ImportPackageSelectionRequestDto extends Z.class(
	{
		package: packageFileSchema,
		selectedProjectId: z
			.string()
			.trim()
			.min(1)
			.openapi(importPackageSelectionRequestFieldDocs.selectedProjectId),
		selectedWorkflowIds: requiredJsonStringIdArray(SELECTED_WORKFLOW_IDS_ERROR_MESSAGE).openapi(
			importPackageSelectionRequestFieldDocs.selectedWorkflowIds,
		),
		deletedWorkflowIds: optionalJsonStringIdArray(DELETED_WORKFLOW_IDS_ERROR_MESSAGE).openapi(
			importPackageSelectionRequestFieldDocs.deletedWorkflowIds,
		),
		workflowConflictPolicy: optionalEnum(['new-version', 'fail', 'skip'], 'new-version').openapi(
			importPackageSelectionRequestFieldDocs.workflowConflictPolicy,
		),
		workflowIdPolicy: optionalEnum(['new', 'source'], 'source').openapi(
			importPackageSelectionRequestFieldDocs.workflowIdPolicy,
		),
		overwriteDeletionPolicy: optionalEnum(['archive', 'hard-delete'], 'archive').openapi(
			importPackageSelectionRequestFieldDocs.overwriteDeletionPolicy,
		),
	},
	{ strict: true },
) {}
