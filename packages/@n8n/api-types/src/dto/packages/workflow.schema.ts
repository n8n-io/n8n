import { z } from 'zod';

const credentialReferenceSchema = z.object({
	id: z.string().nullable(),
	// Optional: export omits it (the target backfills by id on import); an older package that carries one stays valid.
	name: z.string().optional(),
	__aiGatewayManaged: z.boolean().optional(),
});

// Check only the fields that all nodes share. `parameters` must be an object,
// but its content is not checked, because it is different for each node type.
const nodeSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	type: z.string().min(1),
	// `finite()` rejects values such as `1e999`, which JSON parses to Infinity.
	// The missing node type issue returns this value, and the API documents it
	// as a number, but Infinity becomes `null` in a JSON response.
	typeVersion: z.number().finite(),
	position: z.tuple([z.number(), z.number()]),
	parameters: z.record(z.unknown()),
	credentials: z.record(credentialReferenceSchema).optional(),
	disabled: z.boolean().optional(),
	notes: z.string().optional(),
	notesInFlow: z.boolean().optional(),
	continueOnFail: z.boolean().optional(),
	retryOnFail: z.boolean().optional(),
	maxTries: z.number().optional(),
	waitBetweenTries: z.number().optional(),
	alwaysOutputData: z.boolean().optional(),
	executeOnce: z.boolean().optional(),
	onError: z.string().optional(),
	webhookId: z.string().optional(),
});

// Same shape as IConnections: { [sourceNodeName]: { [outputType]: Array<Array<{ node, type, index }>> } }
const connectionLeafSchema = z.object({
	node: z.string(),
	type: z.string(),
	index: z.number(),
});

const connectionsSchema = z.record(z.record(z.array(z.array(connectionLeafSchema).nullable())));

const nodeGroupSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	nodeIds: z.array(z.string().min(1)),
	description: z.string().optional(),
});

export const serializedWorkflowSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	nodes: z.array(nodeSchema),
	connections: connectionsSchema,
	nodeGroups: z.array(nodeGroupSchema).optional(),
	settings: z.record(z.unknown()).optional(),
	parentFolderId: z.string().nullable(),
	isArchived: z.boolean(),
	tagIds: z.array(z.string().min(1)).optional(),
});

export type SerializedWorkflow = z.infer<typeof serializedWorkflowSchema>;
