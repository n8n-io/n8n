import {
	LINKED_INSTANCE_STATUSES,
	type LinkInstanceRequestDto,
	type LinkedInstanceSummary,
	type UpdateLinkedInstanceRequestDto,
} from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { z } from 'zod';

const ENDPOINT = '/linked-instances';

// `z.object` drops the keys that it does not name, so no other field of a response reaches a store.
const linkedInstanceSummarySchema = z.object({
	id: z.string().min(1),
	name: z.string(),
	baseUrl: z.string(),
	// A newer server can send a status that this client does not know yet.
	status: z.enum(LINKED_INSTANCE_STATUSES).catch('unknown'),
	lastVerifiedAt: z.string().nullable(),
	createdAt: z.string(),
	defaultRemoteProject: z.object({ id: z.string(), name: z.string() }).nullable(),
}) satisfies z.ZodType<LinkedInstanceSummary, z.ZodTypeDef, unknown>;

const linkedInstanceListSchema = z.array(linkedInstanceSummarySchema);

const instancePath = (id: string) => `${ENDPOINT}/${encodeURIComponent(id)}`;

/** The links of the current user, oldest first. Rejects when the response has an unknown shape. */
export async function fetchLinkedInstances(
	context: IRestApiContext,
): Promise<LinkedInstanceSummary[]> {
	const response: unknown = await makeRestApiRequest(context, 'GET', ENDPOINT);
	return linkedInstanceListSchema.parse(response);
}

/** Checks the instance with the token, then saves the link. The response never holds the token. */
export async function linkInstance(
	context: IRestApiContext,
	payload: LinkInstanceRequestDto,
): Promise<LinkedInstanceSummary> {
	const response: unknown = await makeRestApiRequest(context, 'POST', ENDPOINT, payload);
	return linkedInstanceSummarySchema.parse(response);
}

/** Checks the instance again. A failed check comes back as a status, not as an error. */
export async function verifyLinkedInstance(
	context: IRestApiContext,
	id: string,
): Promise<LinkedInstanceSummary> {
	const response: unknown = await makeRestApiRequest(context, 'POST', `${instancePath(id)}/verify`);
	return linkedInstanceSummarySchema.parse(response);
}

/** Changes the name, the token or the default project. A new token must pass a check first. */
export async function updateLinkedInstance(
	context: IRestApiContext,
	id: string,
	payload: UpdateLinkedInstanceRequestDto,
): Promise<LinkedInstanceSummary> {
	const response: unknown = await makeRestApiRequest(context, 'PATCH', instancePath(id), payload);
	return linkedInstanceSummarySchema.parse(response);
}

export async function unlinkInstance(context: IRestApiContext, id: string): Promise<void> {
	await makeRestApiRequest(context, 'DELETE', instancePath(id));
}
