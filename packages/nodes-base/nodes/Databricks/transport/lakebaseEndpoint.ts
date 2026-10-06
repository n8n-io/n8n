import { NodeOperationError } from 'n8n-workflow';

import {
	databricksApiRequest,
	getActiveCredentialType,
	getHost,
	type DatabricksContext,
} from '../actions/helpers';

type EndpointsPage = {
	endpoints?: Array<{ status?: { endpoint_type?: string; hosts?: { host?: string } } }>;
};
type FullResponse = { headers?: Record<string, unknown> };

const HOSTNAME = /^[A-Za-z0-9.-]+$/;

/** Data API base of the branch: `https://{read-write endpoint host}/api/2.0/workspace/{workspace id}/rest` */
export async function resolveLakebaseRestBase(
	context: DatabricksContext,
	project: string,
	branch: string,
): Promise<string> {
	// `authentication` is a top-level option, not per item, so index 0 is right for every caller
	const credentialType = getActiveCredentialType(context);
	const host = await getHost(context, credentialType);
	const parent = `${host}/api/2.0/postgres/projects/${encodeURIComponent(project)}/branches/${encodeURIComponent(branch)}`;

	const { endpoints = [] }: EndpointsPage = await databricksApiRequest(context, credentialType, {
		method: 'GET',
		url: `${parent}/endpoints`,
		headers: { Accept: 'application/json' },
		json: true,
	});
	const endpointHost = endpoints.find((e) => e.status?.endpoint_type === 'READ_WRITE')?.status
		?.hosts?.host;
	if (!endpointHost) {
		throw new NodeOperationError(
			context.getNode(),
			'The branch has no read-write compute endpoint',
			{
				description:
					'Create a read-write compute endpoint for the branch in Databricks, or pick another branch.',
			},
		);
	}
	// Both values go into a URL that carries the bearer token, so they must look like a host and an id
	if (!HOSTNAME.test(endpointHost)) {
		throw new NodeOperationError(
			context.getNode(),
			'Databricks returned an unexpected Lakebase endpoint host',
		);
	}

	// The management API does not return the workspace id; the SDK reads it from this header too
	const me: FullResponse = await databricksApiRequest(context, credentialType, {
		method: 'GET',
		url: `${host}/api/2.0/preview/scim/v2/Me`,
		headers: { Accept: 'application/json' },
		json: true,
		returnFullResponse: true,
	});
	const workspaceId = me.headers?.['x-databricks-org-id'];
	if (typeof workspaceId !== 'string' || !/^\d+$/.test(workspaceId)) {
		throw new NodeOperationError(
			context.getNode(),
			'Could not read the workspace ID from Databricks',
		);
	}

	return `https://${endpointHost}/api/2.0/workspace/${workspaceId}/rest`;
}
