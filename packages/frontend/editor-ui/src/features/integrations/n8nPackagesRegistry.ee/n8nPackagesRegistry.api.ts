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

export type N8nPackagesRegistryConnection = {
	id: string;
	type: 'source-control' | 'git';
	name: string;
	enabled: boolean;
	readonly: boolean;
};

const apiRoot = '/n8n-packages-registry';

export async function fetchRegistries(
	context: IRestApiContext,
): Promise<N8nPackagesRegistryConnection[]> {
	return await makeRestApiRequest(context, 'GET', `${apiRoot}/registries`);
}

export async function fetchImportableChanges(
	context: IRestApiContext,
	registryId = 'source-control',
): Promise<N8nPackagesRegistryProjectGroup[]> {
	return await makeRestApiRequest(
		context,
		'GET',
		`${apiRoot}/registries/${registryId}/importable-changes`,
	);
}

export async function importProjectChanges(
	context: IRestApiContext,
	projectId: string,
	registryId = 'source-control',
): Promise<SourceControlledFile[]> {
	return await makeRestApiRequest(
		context,
		'POST',
		`${apiRoot}/registries/${registryId}/projects/${projectId}/import`,
	);
}
