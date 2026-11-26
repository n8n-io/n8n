import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import {
	getGoogleAccessToken,
	getGoogleServiceAccountCredentials,
} from 'n8n-nodes-base/google-service-account';
import {
	assertCredentialAllowsUrl,
	NodeOperationError,
	type ICredentialDataDecryptedObject,
	type ICredentialsDecrypted,
	type ICredentialTestFunctions,
	type INodeCredentialDescription,
	type INodeCredentialTestResult,
	type INodeListSearchResult,
	type INodeProperties,
	type ISupplyDataFunctions,
	requestUrl,
} from 'n8n-workflow';

import {
	getVertexHost,
	isValidVertexLocation,
	resolveVertexLocation,
} from '../nodes/llms/gemini-common/vertex-location';

export const GOOGLE_VERTEX_CUSTOM_PROJECT = '__custom__';

export const googleVertexCredentials: INodeCredentialDescription[] = [
	{
		name: 'googleApi',
		required: true,
		displayOptions: { show: { authentication: ['googleApi'] } },
	},
	{
		name: 'googleVertexAiApi',
		required: true,
		testedBy: 'googleVertexAiCredentialTest',
		displayOptions: { show: { authentication: ['googleVertexAiApi'] } },
	},
];

export const googleVertexAuthentication: INodeProperties = {
	displayName: 'Authentication',
	name: 'authentication',
	type: 'options',
	noDataExpression: true,
	options: [
		{ name: 'Google Service Account', value: 'googleApi' },
		{ name: 'Google Vertex AI', value: 'googleVertexAiApi' },
	],
	default: 'googleApi',
};

function getGoogleVertexProjectId(credentials: ICredentialDataDecryptedObject) {
	const project = credentials.project ?? GOOGLE_VERTEX_CUSTOM_PROJECT;
	return project === GOOGLE_VERTEX_CUSTOM_PROJECT ? credentials.projectId : project;
}

/**
 * The location reaches the SDK as part of the request authority, so an override
 * outside the option list can point an authenticated Vertex call at an arbitrary
 * host. The option list is a UI affordance only and is not enforced on a stored
 * workflow, so the value is checked here, on the one path both Vertex nodes take.
 *
 * Two layers, because they cover different cases. The shape check holds even when
 * the credential allows every domain, which is the default. The allowlist check
 * then honours an administrator's restriction, and runs only when the node asks
 * for a region other than the credential's own: that region is the baseline the
 * credential already grants, and `domains` mode does not read `pinnedUrl`, so
 * checking it there would reject a credential for its own configured endpoint.
 */
function assertVertexLocationAllowed(
	context: ISupplyDataFunctions,
	credentials: ICredentialDataDecryptedObject,
	location: string,
	credentialRegion: string,
): void {
	const node = context.getNode();

	if (!isValidVertexLocation(location)) {
		throw new NodeOperationError(node, `The Region "${location}" is not a valid Vertex region`, {
			description:
				'A region is lowercase letters, digits and hyphens, such as us-central1, or global.',
		});
	}

	if (location === credentialRegion) return;

	assertCredentialAllowsUrl({
		node,
		credentialData: credentials,
		url: `https://${getVertexHost(location)}`,
		pinnedUrl: `https://${getVertexHost(credentialRegion)}`,
		surface: 'Google Vertex',
	});
}

export async function resolveGoogleVertexCredentials(
	context: ISupplyDataFunctions,
	itemIndex: number,
) {
	const authentication = context.getNodeParameter('authentication', itemIndex, 'googleApi');
	const credentialType = authentication === 'googleVertexAiApi' ? 'googleVertexAiApi' : 'googleApi';
	const credentials = await context.getCredentials(credentialType);
	let projectId: unknown;
	if (credentialType === 'googleVertexAiApi') {
		projectId = getGoogleVertexProjectId(credentials);
	} else {
		projectId = context.getNodeParameter('projectId', itemIndex, '', { extractValue: true });
	}
	if (typeof projectId !== 'string' || !projectId.trim()) {
		throw new NodeOperationError(context.getNode(), 'Select or enter a Google Cloud project ID.');
	}
	if (typeof credentials.region !== 'string') {
		throw new NodeOperationError(context.getNode(), 'Select a Region in the credential.');
	}
	const locationOverride = context.getNodeParameter('location', itemIndex, '');
	const location = resolveVertexLocation(
		typeof locationOverride === 'string' ? locationOverride : undefined,
		credentials.region,
	);
	assertVertexLocationAllowed(context, credentials, location, credentials.region);

	return {
		projectId: projectId.trim(),
		location,
		credentials: getGoogleServiceAccountCredentials(credentials),
	};
}

export async function googleVertexAiCredentialTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const data = credential.data ?? {};
	const projectId = getGoogleVertexProjectId(data);
	if (typeof projectId !== 'string' || !projectId.trim()) {
		return { status: 'Error', message: 'Select or enter a Google Cloud project ID.' };
	}

	try {
		const { client_email, private_key } = getGoogleServiceAccountCredentials(data);
		const token = await getGoogleAccessToken.call(
			this,
			{ email: client_email, privateKey: private_key },
			'vertex',
		);
		if (typeof token.access_token !== 'string' || !token.access_token) {
			return {
				status: 'Error',
				message: 'Could not get an access token. Check the service account email and private key.',
			};
		}

		// Check project access without running a model or requiring the Resource Manager API.
		await this.helpers.request({
			method: 'GET',
			uri: requestUrl`https://aiplatform.googleapis.com/v1/projects/${projectId.trim()}/locations`,
			headers: { Authorization: `Bearer ${token.access_token}` },
			qs: { pageSize: 1 },
			json: true,
			timeout: 10000,
		});

		return { status: 'OK', message: 'Connection successful' };
	} catch (error) {
		return {
			status: 'Error',
			message: `Could not connect to Vertex AI. Check the service account details, project ID, and Vertex AI permissions. ${getErrorMessage(error)}`,
		};
	}
}

export async function searchGoogleProjects(
	credentials: ICredentialDataDecryptedObject,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const { ProjectsClient } = await import('@google-cloud/resource-manager');
	const client = new ProjectsClient({
		credentials: getGoogleServiceAccountCredentials(credentials),
	});
	try {
		const trimmedFilter = filter?.trim();
		let query: string | undefined;
		if (trimmedFilter) {
			const prefix = JSON.stringify(`${trimmedFilter}*`);
			query = `displayName:${prefix} projectId:${prefix}`;
		}
		const [projects, nextPage] = await client.searchProjects(
			{ pageToken: paginationToken, ...(query ? { query } : {}) },
			{ autoPaginate: false },
		);
		return {
			results: projects.flatMap((project) => {
				if (!project.projectId) return [];
				return [
					{
						name: project.displayName
							? `${project.displayName} (${project.projectId})`
							: project.projectId,
						value: project.projectId,
					},
				];
			}),
			paginationToken: nextPage?.pageToken ?? undefined,
		};
	} finally {
		await client.close();
	}
}
