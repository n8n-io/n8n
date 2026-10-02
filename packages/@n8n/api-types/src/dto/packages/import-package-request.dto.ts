import { z } from 'zod';

import { publicApiUploadedFileSchema } from '../../schemas/public-api-uploaded-file.schema';
import { Z } from '../../zod-class';

const packageFileSchema = publicApiUploadedFileSchema.openapi({
	description: 'Gzip-compressed tar package (`.n8np`).',
});

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
		projectId: optionalFormId.openapi({
			description:
				"Target project id. Omit or send empty to import into the caller's personal project.",
		}),
		folderId: optionalFormId.openapi({
			description:
				'Optional folder within the target project. Omit or send empty for project root.',
		}),
		credentialMatchingMode: optionalEnum(
			['id-only', 'name-and-type', 'type-only'],
			'id-only',
		).openapi({
			description:
				'How credential references in `requirements.credentials` are matched on the target ' +
				'instance. `id-only` (default) matches by id. `name-and-type` matches credentials with ' +
				'the exact same name and type. `type-only` matches any credential of the same type.',
		}),
		credentialMissingMode: optionalEnum(['must-preexist', 'create-stub'], 'create-stub').openapi({
			description:
				'What to do when a credential reference cannot be resolved. `create-stub` (default) ' +
				'creates empty credential placeholders in the target project for missing references. ' +
				'`must-preexist` requires every referenced credential to already exist.',
		}),
		bindings: bindingsSchema.openapi({
			type: 'string',
			default: '{}',
			description:
				'Optional JSON object of explicit source→target id bindings, keyed by entity type. Only ' +
				'`credentials` is supported today: send `{"credentials":{"<packageCredentialId>":' +
				'"<targetCredentialId>"}}` to map credential ids from the package to credential ids on ' +
				'the target instance.',
		}),
		// Required (unlike every other mode/policy field here), matching the legacy handler, which
		// required it even though this schema alone would otherwise default it to `new-version`.
		workflowConflictPolicy: z.enum(['new-version', 'fail', 'skip']).openapi({
			description:
				'`new-version` updates matching workflows and creates a new version; the archived state ' +
				'follows the package, so a matching workflow is archived or unarchived to match it. ' +
				'`fail` rejects the import when any matching workflow exists, and `skip` leaves matching ' +
				'workflows unchanged. An archive state change also needs the `workflow:delete` scope.',
		}),
		workflowPublishingPolicy: optionalEnum(
			['preserve-published-state', 'match-source', 'publish-all', 'unpublish-all'],
			'preserve-published-state',
		).openapi({
			description:
				'Controls whether imported workflows are published after content is written. ' +
				'`preserve-published-state` (default) follows the existing target workflow when matched, ' +
				'or the package state for a new workflow.',
		}),
		workflowIdPolicy: optionalEnum(['new', 'source'], 'source').openapi({
			description:
				'Controls the id each newly created workflow receives. `source` (default) reuses the ' +
				"package's own workflow id on the target instance; `new` mints a fresh id and records the " +
				'package id as `sourceWorkflowId`. A workflow matched to an existing one always keeps that ' +
				"workflow's current id, regardless of policy.",
		}),
		missingNodeTypeMode: optionalEnum(['fail', 'import-anyway'], 'fail').openapi({
			description:
				'What to do when a workflow in the package uses a node type (or version) this instance ' +
				'does not have. `fail` (default) rejects the import before anything is written. ' +
				'`import-anyway` imports the package; affected workflows are never published, regardless ' +
				'of `workflowPublishingPolicy`.',
		}),
		projectConflictPolicy: optionalEnum(['merge', 'fail', 'overwrite'], 'merge').openapi({
			description:
				'What to do when a project the package defines already exists here (matched by id). ' +
				'`merge` (default) imports into the existing project. `fail` rejects the import before ' +
				'anything is written. Ignored for workflow packages.',
		}),
		folderConflictPolicy: optionalEnumNoDefault(['merge', 'fail', 'overwrite']).openapi({
			description:
				'What to do when a package folder already exists at the same position in the target ' +
				'project. Defaults to whatever `projectConflictPolicy` is. `overwrite` is ' +
				'project-packages-only and needs the `workflow:delete` and `folder:delete` scopes.',
		}),
		overwriteDeletionPolicy: optionalEnum(['archive', 'hard-delete'], 'archive').openapi({
			description:
				'How `folderConflictPolicy=overwrite` removes a workflow the package does not contain. ' +
				'`archive` (default) archives it. `hard-delete` archives it and then permanently deletes ' +
				'the workflow and its executions. Ignored unless `folderConflictPolicy` is `overwrite`.',
		}),
		dataTableMatchingMode: optionalEnum(['by-id'], 'by-id').openapi({
			description: 'Matches on id (imported tables keep their source id); currently the only mode.',
		}),
		dataTableMissingMode: optionalEnum(['create', 'must-preexist', 'do-nothing'], 'create').openapi(
			{
				description:
					'`create` (default) creates it from the package schema, keeping the source id, with no ' +
					'rows. `must-preexist` rejects the import. `do-nothing` skips creation of missing tables.',
			},
		),
		dataTableSchemaConflictPolicy: optionalEnum(['keep-existing', 'fail'], 'keep-existing').openapi(
			{
				description:
					'`keep-existing` (default) accepts a target table that has every package column with the ' +
					'same name and type. `fail` is the strict drift-detection choice.',
			},
		),
		variableMissingMode: optionalEnum(
			['do-nothing', 'must-preexist', 'create-stub', 'create-with-value'],
			'create-with-value',
		).openapi({
			description:
				'Controls what happens when a variable referenced by the package is absent from the ' +
				'target project and the global scope (lookup order: project, then global).',
		}),
		variableConflictPolicy: optionalEnum(
			['keep-existing', 'overwrite', 'fail'],
			'keep-existing',
		).openapi({
			description:
				'What to do when a referenced variable resolves, but the package bundles a different ' +
				'value for it.',
		}),
		variableParentPolicy: optionalEnumNoDefault(['project', 'global']).openapi({
			description:
				'Where `create-with-value` and `create-stub` create missing variables for workflow/folder ' +
				'packages. Must be omitted for project packages, which reject it with a 400.',
		}),
		tagMissingMode: optionalEnum(['create', 'do-nothing'], 'create').openapi({
			description:
				'What to do when a tag referenced by the package has no tag with the same source id on ' +
				'the target instance.',
		}),
		tagConflictPolicy: optionalEnum(['skip', 'fail', 'rename'], 'skip').openapi({
			description:
				'What to do when a referenced tag conflicts on the target instance — either rename drift ' +
				'or a name collision.',
		}),
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

/**
 * Multipart fields carry arrays as JSON text.
 * Reject blank or omitted fields, but accept `[]`.
 */
const requiredJsonStringIdArray = (errorMessage: string) =>
	z
		.string()
		.optional()
		.transform((value, ctx): string[] => {
			if (value === undefined || value.trim().length === 0) {
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
			.openapi({
				description:
					'Id of the single source project the selection is scoped to, as it appears in the ' +
					'package.',
			}),
		selectedWorkflowIds: requiredJsonStringIdArray(SELECTED_WORKFLOW_IDS_ERROR_MESSAGE).openapi({
			type: 'string',
			description:
				'JSON-encoded array of source workflow ids to import from `selectedProjectId`, e.g. ' +
				'`["wf-1","wf-2"]`. An empty array (`[]`) is allowed — useful for a delete-only ' +
				'request. Ids outside the scoped project are dropped.',
		}),
		deletedWorkflowIds: optionalJsonStringIdArray(DELETED_WORKFLOW_IDS_ERROR_MESSAGE).openapi({
			type: 'string',
			description:
				'Optional JSON-encoded array of destination workflow ids to remove from the scoped ' +
				'project, e.g. `["wf-3"]`. Removal happens even under the additive profile. An ' +
				'already-archived or absent id is a no-op unless it is also a selected destination. ' +
				"Must not contain a selected workflow's destination id. Needs the `workflow:delete` scope.",
		}),
		workflowConflictPolicy: optionalEnum(['new-version', 'fail', 'skip'], 'new-version').openapi({
			description:
				'What happens when a selected workflow matches an existing workflow by source id in ' +
				'the target project. `new-version` (default) updates it and creates a new version; ' +
				'`fail` rejects the import when any matching workflow exists; `skip` leaves matching ' +
				'workflows unchanged. An archive state change also needs the `workflow:delete` scope.',
		}),
		workflowIdPolicy: optionalEnum(['new', 'source'], 'source').openapi({
			description:
				'Controls the id each newly created workflow receives. `source` (default) reuses the ' +
				"package's own workflow id on the target instance; `new` mints a fresh id and records " +
				'the package id as `sourceWorkflowId`. Workflows matched to an existing workflow keep ' +
				"that workflow's current id, regardless of policy.",
		}),
	},
	{ strict: true },
) {}
