import {
	LINKED_INSTANCE_TRANSFER_CREDENTIAL_STATUSES,
	type LinkedInstancePushResult,
	type LinkedInstanceTransferPreflight,
	type LinkedInstanceTransferPreflightRequestDto,
	type LinkedInstanceTransferRequestDto,
} from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { z } from 'zod';

import { instancePath } from '../linkedInstances.api';

const remoteProjectSchema = z.object({ id: z.string(), name: z.string() });

// `z.object` drops the keys that it does not name, so no other field of a response reaches the UI.
const preflightSchema = z.object({
	workflowName: z.string(),
	moves: z.object({ nodes: z.number().int().nonnegative() }),
	// A newer server can send a value that this client does not know yet.
	nodeTypeCheck: z.enum(['checked', 'unknown']).catch('unknown'),
	missingNodeTypes: z.array(z.string()),
	credentials: z.array(
		z.object({
			name: z.string(),
			type: z.string(),
			status: z.enum(LINKED_INSTANCE_TRANSFER_CREDENTIAL_STATUSES).catch('unknown'),
		}),
	),
	targetProject: remoteProjectSchema.nullable(),
	subWorkflowCalls: z.array(z.object({ id: z.string(), name: z.string().nullable() })),
}) satisfies z.ZodType<LinkedInstanceTransferPreflight, z.ZodTypeDef, unknown>;

// The URLs stay plain strings here: the move worked, so a strange URL must not turn it into an
// error. The view accepts only http(s) URLs for a link.
const pushResultSchema = z.object({
	remoteWorkflowId: z.string(),
	remoteUrl: z.string(),
	targetProject: remoteProjectSchema.nullable(),
	created: z.boolean(),
	published: z.boolean(),
	publishFailed: z.boolean(),
	credentialsNeedingSetup: z.array(
		z.object({ id: z.string(), name: z.string(), type: z.string() }),
	),
	missingNodeTypes: z.array(z.string()),
	localDeactivated: z.boolean(),
	warnings: z.array(z.string()),
}) satisfies z.ZodType<LinkedInstancePushResult, z.ZodTypeDef, unknown>;

/** Tells what a move of the workflow to the linked instance would do. Changes nothing. */
export async function fetchTransferPreflight(
	context: IRestApiContext,
	linkId: string,
	payload: LinkedInstanceTransferPreflightRequestDto,
): Promise<LinkedInstanceTransferPreflight> {
	const endpoint = `${instancePath(linkId)}/transfer/preflight`;
	const response: unknown = await makeRestApiRequest(context, 'POST', endpoint, payload);
	return preflightSchema.parse(response);
}

/**
 * Copies the workflow to the linked instance. A repeated move updates the same copy. The request
 * sends the push-ref of this tab, so the server can turn off a workflow that this tab edits.
 */
export async function moveWorkflow(
	context: IRestApiContext,
	linkId: string,
	payload: LinkedInstanceTransferRequestDto,
): Promise<LinkedInstancePushResult> {
	const endpoint = `${instancePath(linkId)}/transfer`;
	const response: unknown = await makeRestApiRequest(context, 'POST', endpoint, payload);
	return pushResultSchema.parse(response);
}
