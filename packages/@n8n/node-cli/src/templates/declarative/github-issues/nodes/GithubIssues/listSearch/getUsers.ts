import type {
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodeListSearchItems,
} from 'n8n-workflow';
import { githubApiRequest } from '../shared/transport';

type UserSearchItem = {
	login: string;
	html_url: string;
};

type UserSearchResponse = {
	items: UserSearchItem[];
	total_count: number;
};

export async function getUsers(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const page = paginationToken ? +paginationToken : 1;
	const per_page = 100;

	let responseData: UserSearchResponse = {
		items: [],
		total_count: 0,
	};

	try {
		responseData = await githubApiRequest.call(this, 'GET', '/search/users', {
			q: filter,
			page,
			per_page,
		});
	} catch {
		// will fail if the owner does not have any users
	}

	const results: INodeListSearchItems[] = responseData.items.map((item: UserSearchItem) => ({
		name: item.login,
		value: item.login,
		url: item.html_url,
	}));

	const nextPaginationToken = page * per_page < responseData.total_count ? page + 1 : undefined;
	return { results, paginationToken: nextPaginationToken };
}
