import { z } from 'zod';

/** Package name of the generated custom node types. */
export const CUSTOM_DEFINITIONS_PACKAGE_NAME = 'n8n-custom';

export const customNodeAuthSchema = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('none') }),
	z.object({ kind: z.literal('predefined'), credentialType: z.string().min(1) }),
	z.object({
		kind: z.literal('generic'),
		type: z.enum(['httpHeaderAuth', 'httpBasicAuth', 'httpBearerAuth', 'httpQueryAuth']),
	}),
]);
export type CustomNodeAuth = z.infer<typeof customNodeAuthSchema>;

/** A fixed map of the request, such as headers or query parameters. */
const fixedEntriesSchema = z
	.record(z.string().max(256), z.string().max(4096))
	.refine((entries) => Object.keys(entries).length <= 50, {
		message: 'At most 50 entries are allowed',
	});

export const customActionInputSchema = z.object({
	name: z
		.string()
		.max(64)
		.regex(/^[a-z][A-Za-z0-9]*$/),
	displayName: z.string().min(1).max(128),
	description: z.string().max(1000).optional(),
	type: z.enum(['string', 'number', 'boolean', 'options', 'json']),
	options: z
		.array(z.object({ name: z.string().min(1).max(256), value: z.string().min(1).max(256) }))
		.max(100)
		.optional(),
	required: z.boolean(),
	default: z.union([z.string(), z.number(), z.boolean()]).optional(),
	target: z.enum(['url', 'header', 'query', 'body']),
	key: z.string().min(1).max(256),
});
export type CustomActionInput = z.infer<typeof customActionInputSchema>;

export const customActionRequestSchema = z.object({
	method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
	url: z.string().max(2048),
	headers: fixedEntriesSchema.default({}),
	query: fixedEntriesSchema.default({}),
	bodyType: z.enum(['none', 'json', 'form']).default('none'),
	body: z.record(z.unknown()).default({}),
});
export type CustomActionRequest = z.infer<typeof customActionRequestSchema>;

export const customActionDraftSchema = z.object({
	name: z.string().min(1).max(128),
	description: z.string().max(1000).optional(),
	inputs: z.array(customActionInputSchema).max(50),
	request: customActionRequestSchema,
});
export type CustomActionDraft = z.infer<typeof customActionDraftSchema>;

export type CustomActionEditKind = 'none' | 'cosmetic' | 'revision' | 'version';

export interface CustomActionDraftIssue {
	path: string;
	code: string;
	message: string;
}

export interface CustomActionVersionSummary {
	version: number;
	currentRevision: number;
	revisionCount: number;
	createdAt: string;
	/** Node parameter values that select this version. The editor writes them to the node as they are. */
	pinValues: Record<string, string>;
}

export interface CustomActionResponse {
	id: string;
	name: string;
	description?: string;
	parentNodeType: string | null;
	customNodeId: string | null;
	newestVersion: number;
	versions: CustomActionVersionSummary[];
	draft: CustomActionDraft;
}

/** A custom action of a parent node. `parentAvailable` is false when the parent is not eligible on this instance. */
export interface ParentCustomActionResponse extends CustomActionResponse {
	parentAvailable: boolean;
}

/** A node type that can have custom actions. `shape` tells how the node selects an action. */
export interface CustomActionParent {
	nodeType: string;
	shape: 'resource' | 'operation';
}

export interface CustomNodeResponse {
	id: string;
	nodeType: string;
	displayName: string;
	description?: string;
	baseUrl: string;
	auth: CustomNodeAuth;
	hasIcon: boolean;
	actions: CustomActionResponse[];
	createdAt: string;
	updatedAt: string;
}
