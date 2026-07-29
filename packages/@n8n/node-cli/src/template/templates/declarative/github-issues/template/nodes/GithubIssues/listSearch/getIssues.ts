import type {
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodeListSearchItems,
} from 'n8n-workflow';
import { githubApiRequest } from '../shared/transport';

type IssueSearchItem = {
	number: number;
	title: string;
	html_url: string;
};

type IssueSearchResponse = {
	items: IssueSearchItem[];
	total_count: number;
};

export async function getIssues(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const page = paginationToken ? +paginationToken : 1;
	const per_page = 100;

	let responseData: IssueSearchResponse = {
		items: [],
		total_count: 0,
	};
	const owner = this.getNodeParameter('owner', '', { extractValue: true });
	const repository = this.getNodeParameter('repository', '', { extractValue: true });
	const filters = [filter, `repo:${owner}/${repository}`];

	responseData = await githubApiRequest.call(this, 'GET', '/search/issues', {
		q: filters.filter(Boolean).join(' '),
		page,
		per_page,
	});

	const results: INodeListSearchItems[] = responseData.items.map((item: IssueSearchItem) => ({
		name: item.title,
		value: item.number,
		url: item.html_url,
	}));

	const nextPaginationToken = page * per_page < responseData.total_count ? page + 1 : undefined;
	return { results, paginationToken: nextPaginationToken };
}
