import { z } from 'zod';

// Outer node shape is stable; per-node-type parameter shapes are not. We
// validate the envelope and treat `parameters` as opaque — schema-validating
// parameters per node type would be impossibly maintenance-heavy.
const credentialReferenceSchema = z.object({
	id: z.string().nullable(),
	name: z.string(),
	__aiGatewayManaged: z.boolean().optional(),
});

const nodeSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	type: z.string().min(1),
	typeVersion: z.number(),
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

// IConnections shape: { [sourceNodeName]: { [outputType]: Array<Array<{ node, type, index }>> } }
const connectionLeafSchema = z.object({
	node: z.string(),
	type: z.string(),
	index: z.number(),
});

const connectionsSchema = z.record(z.record(z.array(z.array(connectionLeafSchema).nullable())));

export const serializedWorkflowSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	nodes: z.array(nodeSchema),
	connections: connectionsSchema,
	settings: z.record(z.unknown()).optional(),
	versionId: z.string(),
	parentFolderId: z.string().nullable(),
	isPublished: z.boolean(),
	isArchived: z.boolean(),
});

export type SerializedWorkflow = z.infer<typeof serializedWorkflowSchema>;
