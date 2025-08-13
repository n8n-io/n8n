import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

type NpmPackagesResponse = {
	versions: Record<string, unknown>;
};

export async function getNpmPackageVersions(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const packageName = this.getCurrentNodeParameter('&package', {
		extractValue: true,
	}) as string;

	const response: NpmPackagesResponse = await this.helpers.httpRequest({
		url: `https://registry.npmjs.org/${packageName}`,
	});

	const results: INodePropertyOptions[] = Object.keys(response.versions)
		.reverse()
		.map((version) => ({ name: version, value: version }));

	return results;
}
