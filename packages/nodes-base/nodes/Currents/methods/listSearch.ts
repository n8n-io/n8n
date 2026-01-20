import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

export async function getProjects(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = await this.helpers.httpRequestWithAuthentication.call(this, 'currentsApi', {
		method: 'GET',
		url: 'https://api.currents.dev/v1/projects',
	});

	const projects: IDataObject[] = response.data ?? [];

	const results: INodeListSearchItems[] = projects
		.filter(
			(project) =>
				!filter ||
				(project.name as string)?.toLowerCase().includes(filter.toLowerCase()) ||
				(project.projectId as string)?.toLowerCase().includes(filter.toLowerCase()),
		)
		.map((project) => ({
			name: (project.name as string) ?? (project.projectId as string),
			value: project.projectId as string,
		}))
		.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

	return { results };
}
