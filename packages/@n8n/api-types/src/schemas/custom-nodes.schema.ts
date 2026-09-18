import { z } from 'zod';

/**
 * Definition schema for the Custom Nodes & Custom Operations mockup.
 *
 * A Custom Operation is one HTTP request that has been turned into a reusable
 * node operation. It either belongs to an existing node type
 * (`parentNodeType`, e.g. `n8n-nodes-base.stripe`) or to a Custom Node
 * (`customNodeId`). A Custom Node groups one or more operations for a service
 * that has no node on the instance.
 *
 * Definitions are stored as JSON in the `custom_node_definition` table and are
 * turned into declarative node descriptions at runtime.
 */

export const customOperationHttpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
export type CustomOperationHttpMethod = z.infer<typeof customOperationHttpMethodSchema>;

export const customOperationTargetSchema = z.enum(['url', 'header', 'query', 'body']);
export type CustomOperationTarget = z.infer<typeof customOperationTargetSchema>;

export const customOperationBodyTypeSchema = z.enum(['none', 'json', 'form']);
export type CustomOperationBodyType = z.infer<typeof customOperationBodyTypeSchema>;

export const customOperationInputTypeSchema = z.enum([
	'string',
	'number',
	'boolean',
	'options',
	'json',
]);
export type CustomOperationInputType = z.infer<typeof customOperationInputTypeSchema>;

/** Authentication for the generated node. */
export const customNodeAuthSchema = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('none') }),
	/** Reuse an existing n8n credential type, e.g. `stripeApi`. */
	z.object({ kind: z.literal('predefined'), credentialType: z.string().min(1) }),
	/** One of the generic HTTP credential types of the HTTP Request node. */
	z.object({
		kind: z.literal('generic'),
		type: z.enum(['httpHeaderAuth', 'httpBasicAuth', 'httpBearerAuth', 'httpQueryAuth']),
	}),
]);
export type CustomNodeAuth = z.infer<typeof customNodeAuthSchema>;

export const customOperationInputOptionSchema = z.object({
	name: z.string().min(1),
	value: z.string(),
});

/** A user-facing parameter of the generated operation. */
export const customOperationInputSchema = z.object({
	/** Parameter name used in expressions, e.g. `linePrice`. */
	name: z
		.string()
		.min(1)
		.max(64)
		.regex(/^[A-Za-z_][A-Za-z0-9_]*$/, 'name must be a valid identifier'),
	displayName: z.string().min(1).max(128),
	description: z.string().max(1000).optional(),
	type: customOperationInputTypeSchema,
	options: z.array(customOperationInputOptionSchema).optional(),
	required: z.boolean(),
	default: z.unknown().optional(),
	/** Where the value is injected in the request. */
	target: customOperationTargetSchema,
	/**
	 * Destination key. For `body` and `query` this is a dot/bracket path such
	 * as `line_items[0].price`. For `header` it is the header name. For `url`
	 * it is the placeholder name used in the URL template.
	 */
	key: z.string().min(1).max(256),
});
export type CustomOperationInput = z.infer<typeof customOperationInputSchema>;

/** A value that is baked into the request and never shown to the user. */
export const customOperationFixedDataSchema = z.object({
	target: customOperationTargetSchema,
	key: z.string().min(1).max(256),
	value: z.string(),
});
export type CustomOperationFixedData = z.infer<typeof customOperationFixedDataSchema>;

export const customOperationRequestSchema = z.object({
	method: customOperationHttpMethodSchema,
	/**
	 * Absolute URL or a path relative to the custom node's base URL. May
	 * contain `{{ $parameter.<inputName> }}` placeholders for `url` inputs.
	 */
	url: z.string().min(1),
	headers: z.record(z.string()),
	query: z.record(z.string()),
	bodyType: customOperationBodyTypeSchema,
	/** JSON template with placeholders; only used when `bodyType` is `json`. */
	body: z.string().optional(),
	auth: customNodeAuthSchema,
});
export type CustomOperationRequest = z.infer<typeof customOperationRequestSchema>;

/** The immutable content of one operation version. */
export const customOperationVersionContentSchema = z.object({
	changelog: z.string().max(1000).optional(),
	request: customOperationRequestSchema,
	fixedData: z.array(customOperationFixedDataSchema),
	inputs: z.array(customOperationInputSchema),
});
export type CustomOperationVersionContent = z.infer<typeof customOperationVersionContentSchema>;

export const customOperationVersionSchema = customOperationVersionContentSchema.extend({
	version: z.number().int().positive(),
	createdAt: z.string(),
});
export type CustomOperationVersion = z.infer<typeof customOperationVersionSchema>;

export const customOperationDefinitionSchema = z.object({
	id: z.string(),
	name: z.string().min(1).max(128),
	description: z.string().max(1000).optional(),
	/** Existing node type this operation extends. `null` when part of a Custom Node. */
	parentNodeType: z.string().nullable(),
	/** Custom Node this operation belongs to. `null` when attached to a built-in node. */
	customNodeId: z.string().nullable(),
	versions: z.array(customOperationVersionSchema).min(1),
	activeVersion: z.number().int().positive(),
});
export type CustomOperationDefinition = z.infer<typeof customOperationDefinitionSchema>;

export const customNodeDefinitionSchema = z.object({
	id: z.string(),
	/** Identifier-safe name, e.g. `acmeBilling`. */
	name: z
		.string()
		.min(1)
		.max(64)
		.regex(/^[A-Za-z][A-Za-z0-9]*$/, 'name must be alphanumeric and start with a letter'),
	displayName: z.string().min(1).max(128),
	description: z.string().max(1000).optional(),
	/** Uploaded logo as a data URI (`data:image/svg+xml;base64,...`). */
	iconDataUri: z.string().optional(),
	baseUrl: z.string().optional(),
	auth: customNodeAuthSchema,
	operationIds: z.array(z.string()),
});
export type CustomNodeDefinition = z.infer<typeof customNodeDefinitionSchema>;

/** Row shape returned by `GET /rest/custom-nodes`. */
export type CustomNodeListItem =
	| {
			kind: 'operation';
			id: string;
			name: string;
			/** Full virtual node type name, e.g. `n8n-custom.abc123`. */
			nodeType: string;
			definition: CustomOperationDefinition;
			createdAt: string;
			updatedAt: string;
	  }
	| {
			kind: 'node';
			id: string;
			name: string;
			nodeType: string;
			definition: CustomNodeDefinition;
			/** Operations that belong to this custom node. */
			operations: CustomOperationDefinition[];
			createdAt: string;
			updatedAt: string;
	  };

/** Package name used for all generated node types. */
export const CUSTOM_DEFINITIONS_PACKAGE_NAME = 'n8n-custom';
