import { getGoogleServiceAccountCredentials } from 'n8n-nodes-base/google-service-account';
import {
	NodeOperationError,
	type ICredentialDataDecryptedObject,
	type INodeCredentialDescription,
	type INodeListSearchResult,
	type INodeProperties,
	type ISupplyDataFunctions,
} from 'n8n-workflow';

import { resolveVertexLocation } from '../nodes/llms/gemini-common/vertex-location';

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
		testedBy: 'googleApiCredentialTest',
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

export async function resolveGoogleVertexCredentials(
	context: ISupplyDataFunctions,
	itemIndex: number,
) {
	const authentication = context.getNodeParameter('authentication', itemIndex, 'googleApi');
	const credentialType = authentication === 'googleVertexAiApi' ? 'googleVertexAiApi' : 'googleApi';
	const credentials = await context.getCredentials(credentialType);
	let projectId: unknown;
	if (credentialType === 'googleVertexAiApi') {
		const project = credentials.project ?? GOOGLE_VERTEX_CUSTOM_PROJECT;
		projectId = project === GOOGLE_VERTEX_CUSTOM_PROJECT ? credentials.projectId : project;
		if (typeof projectId === 'string') {
			projectId = projectId.trim();
		}
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

	return { projectId, location, credentials: getGoogleServiceAccountCredentials(credentials) };
}

export async function searchGoogleProjects(
	credentials: ICredentialDataDecryptedObject,
	_filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const { ProjectsClient } = await import('@google-cloud/resource-manager');
	const client = new ProjectsClient({
		credentials: getGoogleServiceAccountCredentials(credentials),
	});
	try {
		const [projects, nextPage] = await client.searchProjects(
			{ pageToken: paginationToken },
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
