import type {
	TemplateSearchQuery,
	TemplateSearchResponse,
	Category,
	TemplateFetchResponse,
} from '@/types';

/**
 * Base URL for n8n template API
 */
const N8N_API_BASE_URL = 'https://api.n8n.io/api';

/**
 * Build query string from search parameters
 */
function buildSearchQueryString(query: TemplateSearchQuery): string {
	const params = new URLSearchParams();

	// there are some preset search criteria we need to set
	// always free templates
	query.price = 0;
	// don't ignore any search criteria
	query.combineWith = 'and';
	// pick most recent templates that match the search
	query.sort = 'createdAt:desc,rank:desc';

	// select how many rows per page and get first page
	query.rows = query.rows ?? 5;
	query.page = 1;

	if (query.search) {
		params.append('search', query.search);
	}
	if (query.rows !== undefined) {
		params.append('rows', query.rows.toString());
	}
	if (query.page !== undefined) {
		params.append('page', query.page.toString());
	}
	if (query.sort) {
		params.append('sort', query.sort);
	}
	if (query.price !== undefined) {
		params.append('price', query.price.toString());
	}
	if (query.combineWith) {
		params.append('combineWith', query.combineWith);
	}

	return params.toString();
}

/**
 * Fetch template/workflow list from n8n API
 */
export async function fetchTemplateList(query: {
	search?: string;
	category?: Category;
	rows?: number;
}): Promise<TemplateSearchResponse> {
	const queryString = buildSearchQueryString(query);
	const url = `${N8N_API_BASE_URL}/templates/search${queryString ? `?${queryString}` : ''}`;

	const response = await fetch(url, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch templates: ${response.status} ${response.statusText}`);
	}

	return (await response.json()) as TemplateSearchResponse;
}

/**
 * Fetch a specific workflow template by ID from n8n API
 */
export async function fetchTemplateByID(id: number): Promise<TemplateFetchResponse> {
	const url = `${N8N_API_BASE_URL}/workflows/templates/${id}`;

	const response = await fetch(url, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch template ${id}: ${response.status} ${response.statusText}`);
	}

	return (await response.json()) as TemplateFetchResponse;
}
