import { isRecord } from '@n8n/utils/is-record';
import { NodeApiError } from 'n8n-workflow';
import type {
	IDataObject,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeListSearchResult,
} from 'n8n-workflow';

import {
	databricksApiRequest,
	extractResourceLocatorValue,
	fetchDatabricksPage,
	getActiveCredentialType,
	getHost,
	makePermissionErrorLegible,
	permissionHintFor,
	sanitizeApiMessage,
	type DatabricksCredentialType,
} from '../actions/helpers';
import type { DatabricksJobRun } from '../actions/interfaces';
import { getRunOutcome } from '../actions/job/runState';
import {
	collectPages,
	lakebaseApiRequest,
	resolveLakebaseRestBase,
	toPage,
	type Page,
} from '../transport';

// Dropdown requests never pass through the router, so its permission-error hook
// doesn't cover them — apply it here for every listSearch call site instead
async function listRequest<T>(
	context: ILoadOptionsFunctions,
	credentialType: DatabricksCredentialType,
	options: IHttpRequestOptions,
	permissionHint?: string,
): Promise<T> {
	try {
		return (await databricksApiRequest(context, credentialType, options)) as T;
	} catch (error) {
		makePermissionErrorLegible(error, permissionHint);
		throw error;
	}
}

export async function getWarehouses(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentialType = getActiveCredentialType(this);
	const host = await getHost(this, credentialType);

	const response = await listRequest<{
		warehouses?: Array<{ id: string; name: string; size?: string }>;
	}>(this, credentialType, {
		method: 'GET',
		url: `${host}/api/2.0/sql/warehouses`,
		headers: { Accept: 'application/json' },
		json: true,
	});

	const warehouses = response.warehouses ?? [];

	const allResults = warehouses.map((warehouse) => ({
		name: warehouse.name,
		value: warehouse.id,
		url: `${host}/sql/warehouses/${warehouse.id}`,
	}));

	if (filter) {
		const filterLower = filter.toLowerCase();
		return { results: allResults.filter((r) => r.name.toLowerCase().includes(filterLower)) };
	}

	return { results: allResults };
}

export async function getEndpoints(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentialType = getActiveCredentialType(this);
	const host = await getHost(this, credentialType);

	const response = await listRequest<{
		endpoints?: Array<{
			name: string;
			config?: {
				served_entities?: Array<{
					external_model?: { name: string };
					foundation_model?: { name: string };
				}>;
			};
		}>;
	}>(this, credentialType, {
		method: 'GET',
		url: `${host}/api/2.0/serving-endpoints`,
		headers: { Accept: 'application/json' },
		json: true,
	});

	const endpoints = response.endpoints ?? [];

	const allResults = endpoints.map((endpoint) => {
		const modelNames = (endpoint.config?.served_entities || [])
			.map((entity) => entity.external_model?.name || entity.foundation_model?.name)
			.filter(Boolean)
			.join(', ');

		return {
			name: endpoint.name,
			value: endpoint.name,
			url: `${host}/ml/endpoints/${endpoint.name}`,
			description: modelNames || 'Model serving endpoint',
		};
	});

	if (filter) {
		const filterLower = filter.toLowerCase();
		return {
			results: allResults.filter(
				(r) =>
					r.name.toLowerCase().includes(filterLower) ||
					r.description?.toLowerCase().includes(filterLower),
			),
		};
	}

	return { results: allResults };
}

export async function getCatalogs(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentialType = getActiveCredentialType(this);
	const host = await getHost(this, credentialType);

	const response = await listRequest<{ catalogs?: Array<{ name: string; comment?: string }> }>(
		this,
		credentialType,
		{
			method: 'GET',
			url: `${host}/api/2.1/unity-catalog/catalogs`,
			headers: { Accept: 'application/json' },
			json: true,
		},
	);

	const catalogs = response.catalogs ?? [];

	const allResults = catalogs.map((catalog) => ({
		name: catalog.name,
		value: catalog.name,
		url: `${host}/explore/data/${catalog.name}`,
	}));

	if (filter) {
		const filterLower = filter.toLowerCase();
		return { results: allResults.filter((r) => r.name.toLowerCase().includes(filterLower)) };
	}

	return { results: allResults };
}

export async function getSchemas(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentialType = getActiveCredentialType(this);
	const host = await getHost(this, credentialType);

	let selectedCatalog: string | undefined;
	try {
		selectedCatalog =
			extractResourceLocatorValue(this.getCurrentNodeParameter('catalogName') as unknown) ||
			undefined;
	} catch (e) {
		selectedCatalog = undefined;
	}

	if (!selectedCatalog) {
		return { results: [{ name: 'Please Select a Catalog First', value: '' }] };
	}

	try {
		const schemasResponse = await listRequest<{ schemas?: Array<{ name: string }> }>(
			this,
			credentialType,
			{
				method: 'GET',
				url: `${host}/api/2.1/unity-catalog/schemas?catalog_name=${selectedCatalog}`,
				headers: { Accept: 'application/json' },
				json: true,
			},
		);

		const schemas = schemasResponse.schemas ?? [];

		const allSchemas = schemas.map((schema) => ({
			name: schema.name,
			value: schema.name,
			url: `${host}/explore/data/${selectedCatalog}/${schema.name}`,
		}));

		if (filter) {
			const filterLower = filter.toLowerCase();
			return { results: allSchemas.filter((r) => r.name.toLowerCase().includes(filterLower)) };
		}

		return { results: allSchemas };
	} catch (e) {
		const message = sanitizeApiMessage(e instanceof Error ? e.message : String(e));
		return {
			results: [
				{ name: `Error loading schemas for catalog ${selectedCatalog}: ${message}`, value: '' },
			],
		};
	}
}

async function fetchResourcesInSchema<T extends { name: string }>(
	context: ILoadOptionsFunctions,
	credentialType: DatabricksCredentialType,
	host: string,
	apiPath: string,
	catalogName: string,
	schemaName: string,
	responseKey: string,
): Promise<T[]> {
	const response = await listRequest<Record<string, T[] | undefined>>(context, credentialType, {
		method: 'GET',
		url: `${host}${apiPath}?catalog_name=${catalogName}&schema_name=${schemaName}`,
		headers: { Accept: 'application/json' },
		json: true,
	});
	return response[responseKey] ?? [];
}

function getSelectedCatalogAndSchema(context: ILoadOptionsFunctions): {
	selectedCatalog: string | undefined;
	selectedSchema: string | undefined;
} {
	let selectedCatalog: string | undefined;
	let selectedSchema: string | undefined;
	try {
		selectedCatalog =
			extractResourceLocatorValue(context.getCurrentNodeParameter('catalogName') as unknown) ||
			undefined;
		selectedSchema =
			extractResourceLocatorValue(context.getCurrentNodeParameter('schemaName') as unknown) ||
			undefined;
	} catch (e) {
		// Parameters may not be available in all contexts
	}
	return { selectedCatalog, selectedSchema };
}

export async function getVolumes(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentialType = getActiveCredentialType(this);
	const host = await getHost(this, credentialType);
	const { selectedCatalog, selectedSchema } = getSelectedCatalogAndSchema(this);

	if (!selectedCatalog) {
		return { results: [{ name: 'Please Select a Catalog First', value: '' }] };
	}
	if (!selectedSchema) {
		return { results: [{ name: 'Please Select a Schema First', value: '' }] };
	}

	try {
		const volumes = await fetchResourcesInSchema<{ name: string; volume_type?: string }>(
			this,
			credentialType,
			host,
			'/api/2.1/unity-catalog/volumes',
			selectedCatalog,
			selectedSchema,
			'volumes',
		);

		const allResults = volumes.map((volume) => {
			const fullPath = `${selectedCatalog}.${selectedSchema}.${volume.name}`;
			return {
				name: fullPath,
				value: fullPath,
				description: `${selectedCatalog} / ${selectedSchema}${volume.volume_type ? ` (${volume.volume_type})` : ''}`,
				url: `${host}/explore/data/${selectedCatalog}/${selectedSchema}/${volume.name}`,
			};
		});

		if (filter) {
			const filterLower = filter.toLowerCase();
			return {
				results: allResults.filter(
					(r) =>
						r.name.toLowerCase().includes(filterLower) ||
						r.description.toLowerCase().includes(filterLower),
				),
			};
		}

		return { results: allResults };
	} catch (e) {
		const message = sanitizeApiMessage(e instanceof Error ? e.message : String(e));
		return {
			results: [
				{
					name: `Error loading volumes for ${selectedCatalog}.${selectedSchema}: ${message}`,
					value: '',
				},
			],
		};
	}
}

export async function getTables(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentialType = getActiveCredentialType(this);
	const host = await getHost(this, credentialType);
	const { selectedCatalog, selectedSchema } = getSelectedCatalogAndSchema(this);

	if (!selectedCatalog) {
		return { results: [{ name: 'Please Select a Catalog First', value: '' }] };
	}
	if (!selectedSchema) {
		return { results: [{ name: 'Please Select a Schema First', value: '' }] };
	}

	try {
		const tables = await fetchResourcesInSchema<{ name: string; table_type?: string }>(
			this,
			credentialType,
			host,
			'/api/2.1/unity-catalog/tables',
			selectedCatalog,
			selectedSchema,
			'tables',
		);

		const allResults = tables.map((table) => {
			const fullPath = `${selectedCatalog}.${selectedSchema}.${table.name}`;
			return {
				name: fullPath,
				value: fullPath,
				description: `${selectedCatalog} / ${selectedSchema}${table.table_type ? ` (${table.table_type})` : ''}`,
				url: `${host}/explore/data/${selectedCatalog}/${selectedSchema}/${table.name}`,
			};
		});

		if (filter) {
			const filterLower = filter.toLowerCase();
			return {
				results: allResults.filter(
					(r) =>
						r.name.toLowerCase().includes(filterLower) ||
						r.description.toLowerCase().includes(filterLower),
				),
			};
		}

		return { results: allResults };
	} catch (e) {
		const message = sanitizeApiMessage(e instanceof Error ? e.message : String(e));
		return {
			results: [
				{
					name: `Error loading tables for ${selectedCatalog}.${selectedSchema}: ${message}`,
					value: '',
				},
			],
		};
	}
}

export async function getFunctions(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentialType = getActiveCredentialType(this);
	const host = await getHost(this, credentialType);
	const { selectedCatalog, selectedSchema } = getSelectedCatalogAndSchema(this);

	if (!selectedCatalog) {
		return { results: [{ name: 'Please Select a Catalog First', value: '' }] };
	}
	if (!selectedSchema) {
		return { results: [{ name: 'Please Select a Schema First', value: '' }] };
	}

	try {
		const functions = await fetchResourcesInSchema<{ name: string; data_type?: string }>(
			this,
			credentialType,
			host,
			'/api/2.1/unity-catalog/functions',
			selectedCatalog,
			selectedSchema,
			'functions',
		);

		const allResults = functions.map((func) => {
			const fullPath = `${selectedCatalog}.${selectedSchema}.${func.name}`;
			return {
				name: fullPath,
				value: fullPath,
				description: `${selectedCatalog} / ${selectedSchema}${func.data_type ? ` → ${func.data_type}` : ''}`,
				url: `${host}/explore/data/${selectedCatalog}/${selectedSchema}/${func.name}`,
			};
		});

		if (filter) {
			const filterLower = filter.toLowerCase();
			return {
				results: allResults.filter(
					(r) =>
						r.name.toLowerCase().includes(filterLower) ||
						r.description.toLowerCase().includes(filterLower),
				),
			};
		}

		return { results: allResults };
	} catch (e) {
		const message = sanitizeApiMessage(e instanceof Error ? e.message : String(e));
		return {
			results: [
				{
					name: `Error loading functions for ${selectedCatalog}.${selectedSchema}: ${message}`,
					value: '',
				},
			],
		};
	}
}

const JOBS_PAGE_SIZE = 100;
const JOBS_SEARCH_MAX_PAGES = 10;

type JobSummary = { job_id: number; settings?: { name?: string } };
type JobsListPage = { jobs?: JobSummary[]; next_page_token?: string };

async function fetchListPage<T>(
	context: ILoadOptionsFunctions,
	credentialType: DatabricksCredentialType,
	host: string,
	path: string,
	qs: IDataObject,
	pageToken?: string,
	permissionHint?: string,
): Promise<T> {
	try {
		return await fetchDatabricksPage<T>(context, credentialType, host, path, qs, pageToken);
	} catch (error) {
		makePermissionErrorLegible(error, permissionHint);
		throw error;
	}
}

export async function getJobs(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const credentialType = getActiveCredentialType(this);
	const host = await getHost(this, credentialType);
	const toListItem = (job: JobSummary) => ({
		name: job.settings?.name ?? String(job.job_id),
		value: String(job.job_id),
		url: `${host}/jobs/${job.job_id}`,
	});

	const fetchPage = async (pageToken?: string) =>
		await fetchListPage<JobsListPage>(
			this,
			credentialType,
			host,
			'/api/2.2/jobs/list',
			{ limit: JOBS_PAGE_SIZE },
			pageToken,
			permissionHintFor('job'),
		);

	if (!filter) {
		const page = await fetchPage(paginationToken);
		return { results: (page.jobs ?? []).map(toListItem), paginationToken: page.next_page_token };
	}

	// The API's `name` filter only matches a whole job name, so search scans pages instead
	const filterLower = filter.toLowerCase();
	const results: INodeListSearchResult['results'] = [];
	let pageToken = paginationToken;
	for (let page = 0; page < JOBS_SEARCH_MAX_PAGES && (page === 0 || pageToken); page++) {
		const response = await fetchPage(pageToken);
		results.push(
			...(response.jobs ?? [])
				.filter((job) => (job.settings?.name ?? '').toLowerCase().includes(filterLower))
				.map(toListItem),
		);
		pageToken = response.next_page_token;
	}

	return { results, paginationToken: pageToken };
}

/** `runs/list` caps `limit` at 25 */
const RUNS_PAGE_SIZE = 25;
const RUNS_SEARCH_MAX_PAGES = 10;

type RunsListPage = { runs?: DatabricksJobRun[]; next_page_token?: string };

function describeRun(run: DatabricksJobRun): string {
	const { code } = getRunOutcome(run);
	const startedAt = run.start_time
		? `${new Date(run.start_time).toISOString().replace('T', ' ').slice(0, 19)} UTC`
		: undefined;
	return [run.run_name || `Job ${run.job_id}`, code, startedAt, `Run ${run.run_id}`]
		.filter(Boolean)
		.join(' · ');
}

export async function getRuns(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const credentialType = getActiveCredentialType(this);
	const host = await getHost(this, credentialType);
	const toListItem = (run: DatabricksJobRun) => ({
		name: describeRun(run),
		value: String(run.run_id),
		url: run.run_page_url,
	});

	const fetchPage = async (pageToken?: string) =>
		await fetchListPage<RunsListPage>(
			this,
			credentialType,
			host,
			'/api/2.2/jobs/runs/list',
			{ limit: RUNS_PAGE_SIZE },
			pageToken,
			permissionHintFor('job'),
		);

	if (!filter) {
		const page = await fetchPage(paginationToken);
		return { results: (page.runs ?? []).map(toListItem), paginationToken: page.next_page_token };
	}

	// `runs/list` has no name filter, so search scans pages the same way getJobs does
	const filterLower = filter.toLowerCase();
	const results: INodeListSearchResult['results'] = [];
	let pageToken = paginationToken;
	for (let page = 0; page < RUNS_SEARCH_MAX_PAGES && (page === 0 || pageToken); page++) {
		const response = await fetchPage(pageToken);
		results.push(
			...(response.runs ?? [])
				.map(toListItem)
				.filter((item) => item.name.toLowerCase().includes(filterLower)),
		);
		pageToken = response.next_page_token;
	}

	return { results, paginationToken: pageToken };
}

const LAKEBASE_PAGE_SIZE = 100;
const LAKEBASE_SEARCH_MAX_PAGES = 10;
// Internal tables the Data API lists under Ignore privileges; a user table named databricks_* is still reachable By ID
const INTERNAL_TABLE_PREFIX = /^databricks_/;

function getSelectedLakebaseTarget(context: ILoadOptionsFunctions) {
	const read = (name: string) =>
		extractResourceLocatorValue(context.getCurrentNodeParameter(name)) || undefined;
	return {
		project: read('lakebaseProject'),
		branch: read('lakebaseBranch'),
		database: read('lakebaseDatabase'),
		schema: read('lakebaseSchema'),
	};
}

const byText = (filter: string | undefined) => {
	const needle = filter?.toLowerCase();
	return (item: { name: string; value: string }) =>
		!needle ||
		item.name.toLowerCase().includes(needle) ||
		item.value.toLowerCase().includes(needle);
};

// The management API has no name filter, so a search scans pages the way getJobs does
async function listLakebase<P, T>(
	context: ILoadOptionsFunctions,
	path: string,
	entries: (page: P) => T[] | undefined,
	filter: string | undefined,
	paginationToken: string | undefined,
): Promise<Page<T>> {
	const credentialType = getActiveCredentialType(context);
	const host = await getHost(context, credentialType);
	const fetchPage = async (pageToken?: string) => {
		const page = await fetchListPage<P & { next_page_token?: string }>(
			context,
			credentialType,
			host,
			path,
			{ page_size: LAKEBASE_PAGE_SIZE },
			pageToken,
		);
		return toPage(entries(page), page.next_page_token);
	};
	return await collectPages(
		fetchPage,
		{ deadlineEpochMs: Infinity, maxPages: filter ? LAKEBASE_SEARCH_MAX_PAGES : 1 },
		paginationToken,
	);
}

type LakebaseProject = { project_id: string; status?: { display_name?: string } };
type LakebaseBranch = { branch_id: string; status?: { default?: boolean } };
type LakebaseDatabase = { database_id: string; status?: { postgres_database?: string } };

export async function getLakebaseProjects(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const { items, nextPageToken } = await listLakebase(
		this,
		'/api/2.0/postgres/projects',
		(page: { projects?: LakebaseProject[] }) => page.projects,
		filter,
		paginationToken,
	);
	const results = items
		.map((p) => ({ name: p.status?.display_name || p.project_id, value: p.project_id }))
		.filter(byText(filter));
	return { results, paginationToken: nextPageToken };
}

export async function getLakebaseBranches(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const { project } = getSelectedLakebaseTarget(this);
	if (!project) {
		return { results: [{ name: 'Please Select a Project First', value: '' }] };
	}

	const { items, nextPageToken } = await listLakebase(
		this,
		`/api/2.0/postgres/projects/${encodeURIComponent(project)}/branches`,
		(page: { branches?: LakebaseBranch[] }) => page.branches,
		filter,
		paginationToken,
	);
	// A locator cannot preselect a single branch: `default` is a static literal and the
	// editor never writes a value from a search response. Leading with the default branch is the fallback.
	const results = items
		.sort((a, b) => (b.status?.default ? 1 : 0) - (a.status?.default ? 1 : 0))
		.map((b) => ({
			name: b.branch_id,
			value: b.branch_id,
			description: b.status?.default ? 'Default branch' : undefined,
		}))
		.filter(byText(filter));
	return { results, paginationToken: nextPageToken };
}

export async function getLakebaseDatabases(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const { project, branch } = getSelectedLakebaseTarget(this);
	if (!project) {
		return { results: [{ name: 'Please Select a Project First', value: '' }] };
	}
	if (!branch) {
		return { results: [{ name: 'Please Select a Branch First', value: '' }] };
	}

	const { items, nextPageToken } = await listLakebase(
		this,
		`/api/2.0/postgres/projects/${encodeURIComponent(project)}/branches/${encodeURIComponent(branch)}/databases`,
		(page: { databases?: LakebaseDatabase[] }) => page.databases,
		filter,
		paginationToken,
	);
	// The Data API path uses the Postgres database name, which can differ from the resource id
	const results = items
		.map((d) => ({ name: d.database_id, value: d.status?.postgres_database || d.database_id }))
		.filter(byText(filter));
	return { results, paginationToken: nextPageToken };
}

// No management endpoint lists Postgres schemas; other schemas go through By ID
export async function getLakebaseSchemas(
	this: ILoadOptionsFunctions,
): Promise<INodeListSearchResult> {
	// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
	return { results: [{ name: 'public', value: 'public' }] };
}

export async function getLakebaseTables(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const { project, branch, database, schema } = getSelectedLakebaseTarget(this);
	if (!project) {
		return { results: [{ name: 'Please Select a Project First', value: '' }] };
	}
	if (!branch) {
		return { results: [{ name: 'Please Select a Branch First', value: '' }] };
	}
	if (!database) {
		return { results: [{ name: 'Please Select a Database First', value: '' }] };
	}
	if (!schema) {
		return { results: [{ name: 'Please Select a Schema First', value: '' }] };
	}
	try {
		const base = await resolveLakebaseRestBase(this, project, branch);
		const doc: { components?: { schemas?: Record<string, unknown> } } = await lakebaseApiRequest(
			this,
			{
				method: 'GET',
				url: `${base}/${encodeURIComponent(database)}/${encodeURIComponent(schema)}/openapi.json`,
				headers: { Accept: 'application/openapi+json, application/json' },
				json: true,
			},
		);
		const results = Object.keys(doc.components?.schemas ?? {})
			.filter((name) => !INTERNAL_TABLE_PREFIX.test(name))
			.map((name) => ({ name, value: name }))
			.filter(byText(filter));
		return { results };
	} catch (error) {
		if (
			error instanceof NodeApiError &&
			isRecord(error.context.data) &&
			error.context.data.code === 'PGRST205'
		) {
			// Only a NodeApiError keeps its description on the way to the dropdown, so mutate like makePermissionErrorLegible does
			error.message =
				'Turn on the "OpenAPI specification" setting of the Data API to list tables, or enter the table name By ID';
			error.description =
				'In Databricks open the project, then Data API > API > Advanced settings, and enable OpenAPI specification.';
			throw error;
		}
		makePermissionErrorLegible(error);
		throw error;
	}
}
