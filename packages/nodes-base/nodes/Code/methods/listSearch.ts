import {
	NodeOperationError,
	type ILoadOptionsFunctions,
	type INodeListSearchItems,
	type INodeListSearchResult,
} from 'n8n-workflow';

type NpmPackage = {
	package: {
		name: string;
		description: string;
		links: {
			npm: string;
		};
	};
};

type NpmPackagesResponse = {
	total: number;
	objects: NpmPackage[];
};

export async function getNpmPackages(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	if (!filter || filter.length < 3) {
		throw new NodeOperationError(
			this.getNode(),
			'Please provide at least 3 characters to search for packages',
		);
	}

	const from = paginationToken ? +paginationToken : 0;
	const size = 100;

	const response: NpmPackagesResponse = await this.helpers.httpRequest({
		url: 'https://registry.npmjs.org/-/v1/search',
		qs: { text: filter, size, from },
	});

	const results: INodeListSearchItems[] = response.objects.map((item) => ({
		name: item.package.name,
		description: item.package.description,
		value: item.package.name,
		url: item.package.links.npm,
	}));

	const nextPaginationToken = from + size < response.total ? from + size : undefined;
	return { results, paginationToken: nextPaginationToken };
}
