import type {
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeListSearchResult,
} from 'n8n-workflow';

import {
	databricksApiRequest,
	extractResourceLocatorValue,
	getActiveCredentialType,
	getHost,
	makePermissionErrorLegible,
	sanitizeApiMessage,
} from '../actions/helpers';

// Dropdown requests never pass through the router, so its permission-error hook
// doesn't cover them — apply it here for every listSearch call site instead
async function listRequest<T>(
	context: ILoadOptionsFunctions,
	credentialType: 'databricksApi' | 'databricksOAuth2Api',
	options: IHttpRequestOptions,
): Promise<T> {
	try {
		return (await databricksApiRequest(context, credentialType, options)) as T;
	} catch (error) {
		makePermissionErrorLegible(error);
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
	credentialType: 'databricksApi' | 'databricksOAuth2Api',
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
