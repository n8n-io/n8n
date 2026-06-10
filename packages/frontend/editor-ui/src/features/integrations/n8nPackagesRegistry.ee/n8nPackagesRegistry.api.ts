import type { SourceControlledFile } from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

export type N8nPackagesRegistryProjectGroup = {
	project: {
		id: string | null;
		name: string;
		type: 'team' | 'personal' | 'global';
	};
	changes: SourceControlledFile[];
};

const apiRoot = '/n8n-packages-registry';

export async function fetchImportableChanges(
	context: IRestApiContext,
): Promise<N8nPackagesRegistryProjectGroup[]> {
	return await makeRestApiRequest(context, 'GET', `${apiRoot}/importable-changes`);
}

export async function importProjectChanges(
	context: IRestApiContext,
	projectId: string,
): Promise<SourceControlledFile[]> {
	return await makeRestApiRequest(context, 'POST', `${apiRoot}/projects/${projectId}/import`);
}
