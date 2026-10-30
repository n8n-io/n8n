import { z } from 'zod';

import { dataTableFilterSchema } from './data-table-filter.schema';
import { dataTableColumnNameSchema, dataTableColumnValueSchema } from './data-table.schema';

/** The key is a JS identifier, so the SDK can expose it as `n8n.tables.<key>`. */
export const appBindingKeySchema = z
	.string()
	.regex(
		/^[a-z][a-zA-Z0-9]{0,63}$/,
		'A binding key starts with a lowercase letter and contains only letters and numbers (max 64).',
	);

const resourceIdSchema = z.string().min(1).max(36);

function uniquePermissions<T extends string>(values: z.ZodEnum<[T, ...T[]]>) {
	return z
		.array(values)
		.min(1)
		.refine((list) => new Set(list).size === list.length, 'Permissions must be unique.');
}

export const appDataTablePermissionSchema = z.enum(['read', 'insert', 'update', 'delete']);
export type AppDataTablePermission = z.infer<typeof appDataTablePermissionSchema>;

/** `chat` sends messages. `history` reads the visitor's own conversation. */
export const appAgentPermissionSchema = z.enum(['chat', 'history']);
export type AppAgentPermission = z.infer<typeof appAgentPermissionSchema>;

export const appWorkflowBindingSchema = z.object({
	key: appBindingKeySchema,
	kind: z.literal('workflow'),
	workflowId: resourceIdSchema,
});

export const appDataTableBindingSchema = z.object({
	key: appBindingKeySchema,
	kind: z.literal('dataTable'),
	dataTableId: resourceIdSchema,
	permissions: uniquePermissions(appDataTablePermissionSchema),
});

export const appAgentBindingSchema = z.object({
	key: appBindingKeySchema,
	kind: z.literal('agent'),
	agentId: resourceIdSchema,
	permissions: uniquePermissions(appAgentPermissionSchema),
});

export const appBindingSchema = z.discriminatedUnion('kind', [
	appWorkflowBindingSchema,
	appDataTableBindingSchema,
	appAgentBindingSchema,
]);

export const MAX_APP_BINDINGS = 50;

export const appBindingsSchema = z
	.array(appBindingSchema)
	.max(MAX_APP_BINDINGS)
	.refine(
		(bindings) => new Set(bindings.map((b) => b.key)).size === bindings.length,
		'Binding keys must be unique.',
	);

export type AppBinding = z.infer<typeof appBindingSchema>;
export type AppBindingKind = AppBinding['kind'];
export type AppWorkflowBinding = z.infer<typeof appWorkflowBindingSchema>;
export type AppDataTableBinding = z.infer<typeof appDataTableBindingSchema>;
export type AppAgentBinding = z.infer<typeof appAgentBindingSchema>;

/** A JSON Schema document. Kept opaque so this package needs no JSON Schema types. */
export type AppJsonSchema = Record<string, unknown>;

export type AppDescribedWorkflowBinding = AppWorkflowBinding & {
	name: string;
	published: boolean;
	/** The object the runtime validates the request body against. */
	input: AppJsonSchema;
	/** Best effort: inferred from the latest successful execution. */
	output: AppJsonSchema;
	missing?: false;
};

export type AppDescribedDataTableBinding = AppDataTableBinding & {
	name: string;
	columns: Array<{ name: string; type: string }>;
	/** One row as the runtime returns it. */
	row: AppJsonSchema;
	missing?: false;
};

export type AppDescribedAgentBinding = AppAgentBinding & {
	name: string;
	published: boolean;
	missing?: false;
};

/** The bound resource no longer exists in the app project. */
export type AppDescribedMissingBinding = AppBinding & { name: string; missing: true };

export type AppDescribedBinding =
	| AppDescribedWorkflowBinding
	| AppDescribedDataTableBinding
	| AppDescribedAgentBinding
	| AppDescribedMissingBinding;

export type AppBindingWarning = {
	key: string;
	code: 'public_write_access' | 'resource_missing' | 'resource_unpublished';
	message: string;
};

export type AppBindingsResponse = {
	/** The draft version that owns the bindings. `null` before the first source save. */
	versionId: string | null;
	bindings: AppDescribedBinding[];
	warnings: AppBindingWarning[];
};

/** What the app frontend can learn about its bindings. Resource IDs stay on the server. */
export type AppRuntimeBinding =
	| { key: string; kind: 'workflow' }
	| { key: string; kind: 'dataTable'; permissions: AppDataTablePermission[] }
	| { key: string; kind: 'agent'; permissions: AppAgentPermission[] };

export type AppRuntimeMeResponse = {
	user: {
		id: string;
		email: string | null;
		firstName: string | null;
		lastName: string | null;
	} | null;
	visibility: 'public' | 'project' | 'instance';
};

export const APP_RUNTIME_ERROR_CODES = [
	'app_not_found',
	'binding_not_found',
	'permission_denied',
	'invalid_input',
	'resource_missing',
	'workflow_not_published',
	'workflow_incompatible',
	'workflow_not_callable',
	'agent_not_published',
	'agents_disabled',
	'run_in_progress',
	'run_not_found',
	'too_many_requests',
	'payload_too_large',
	'unsupported_media_type',
	'forbidden_origin',
	'unauthenticated',
	'forbidden',
	'execution_failed',
] as const;
export type AppRuntimeErrorCode = (typeof APP_RUNTIME_ERROR_CODES)[number];

export type AppRuntimeErrorBody = {
	code: AppRuntimeErrorCode;
	message: string;
	issues?: Array<{ path: string[]; code: string }>;
};

/** Every runtime request must send this header. It forces a CORS preflight on cross-origin calls. */
export const APP_RUNTIME_REQUEST_HEADER = 'x-n8n-app-request';

export const APP_RUNTIME_MAX_INSERT_ROWS = 100;

const appRuntimeRowSchema = z.record(dataTableColumnNameSchema, dataTableColumnValueSchema);
export type AppRuntimeRowInput = z.infer<typeof appRuntimeRowSchema>;

export const appRuntimeInsertRowsSchema = z.object({
	data: z.array(appRuntimeRowSchema).min(1).max(APP_RUNTIME_MAX_INSERT_ROWS),
});

const nonEmptyFilterSchema = dataTableFilterSchema.refine(
	(filter) => filter.filters.length > 0,
	'The filter must contain at least one condition.',
);

export const appRuntimeUpdateRowsSchema = z.object({
	filter: nonEmptyFilterSchema,
	data: appRuntimeRowSchema.refine((row) => Object.keys(row).length > 0, 'Data must not be empty.'),
});

export const appRuntimeDeleteRowsSchema = z.object({
	filter: nonEmptyFilterSchema,
});

export type AppWorkflowRunStatus =
	| 'success'
	| 'error'
	| 'waiting'
	| 'canceled'
	| 'running'
	| 'unknown';

export type AppWorkflowRunResult = {
	executionId: string;
	status: AppWorkflowRunStatus;
	/** The items of the node that ran last, from all of its main outputs. */
	output?: unknown;
	error?: string;
};

export const appAgentChatRequestSchema = z.object({
	message: z.string().min(1).max(8000),
	sessionId: z.string().uuid(),
});
export type AppAgentChatRequest = z.infer<typeof appAgentChatRequestSchema>;

export const appAgentResumeRequestSchema = z.object({
	sessionId: z.string().uuid(),
	runId: z.string().min(1),
	toolCallId: z.string().min(1),
	// Each interactive tool validates its own resume payload.
	resumeData: z.unknown(),
});
export type AppAgentResumeRequest = z.infer<typeof appAgentResumeRequestSchema>;

export const appAgentMessagesQuerySchema = appAgentChatRequestSchema.pick({ sessionId: true });
