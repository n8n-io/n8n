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
 * Type guard for TemplateSearchResponse
 */
function isTemplateSearchResponse(data: unknown): data is TemplateSearchResponse {
	if (typeof data !== 'object' || data === null) return false;
	const obj = data as Record<string, unknown>;
	return typeof obj.totalWorkflows === 'number' && Array.isArray(obj.workflows);
}

/**
 * Type guard for TemplateFetchResponse
 */
function isTemplateFetchResponse(data: unknown): data is TemplateFetchResponse {
	if (typeof data !== 'object' || data === null) return false;
	const obj = data as Record<string, unknown>;
	return (
		typeof obj.id === 'number' &&
		typeof obj.name === 'string' &&
		typeof obj.workflow === 'object' &&
		obj.workflow !== null
	);
}

/**
 * Build query string from search parameters
 */
function buildSearchQueryString(query: TemplateSearchQuery): string {
	const params = new URLSearchParams();

	// Fixed preset values (not overridable)
	params.append('price', '0'); // Always free templates
	params.append('combineWith', 'and'); // Don't ignore any search criteria
	params.append('sort', 'createdAt:desc,rank:desc'); // Most recent templates first
	params.append('rows', String(query.rows ?? 5)); // Default 5 results per page
	params.append('page', '1'); // Always first page

	// Optional user-provided values
	if (query.search) params.append('search', query.search);
	if (query.category) params.append('category', query.category);

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

	const data: unknown = await response.json();
	if (!isTemplateSearchResponse(data)) {
		throw new Error('Invalid response format from templates API');
	}
	return data;
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

	const data: unknown = await response.json();
	if (!isTemplateFetchResponse(data)) {
		throw new Error(`Invalid response format from template ${id} API`);
	}
	return data;
}
