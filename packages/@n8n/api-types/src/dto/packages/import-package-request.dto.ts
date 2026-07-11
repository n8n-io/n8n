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
	'folderConflictPolicy',
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
	folderConflictPolicy: z.enum(['merge', 'fail']).optional().default('merge'),
}) {}
