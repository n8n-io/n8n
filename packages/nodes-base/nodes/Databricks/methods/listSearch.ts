import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { getActiveCredentialType } from '../actions/helpers';
import type { DatabricksCredentials } from '../actions/interfaces';

export async function getWarehouses(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentialType = getActiveCredentialType(this);
	const credentials = await this.getCredentials<DatabricksCredentials>(credentialType);
	const host = credentials.host.replace(/\/$/, '');

	const response = (await this.helpers.httpRequestWithAuthentication.call(this, credentialType, {
		method: 'GET',
		url: `${host}/api/2.0/sql/warehouses`,
		headers: { Accept: 'application/json' },
		json: true,
	})) as { warehouses?: Array<{ id: string; name: string; size?: string }> };

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
	const credentials = await this.getCredentials<DatabricksCredentials>(credentialType);
	const host = credentials.host.replace(/\/$/, '');

	const response = (await this.helpers.httpRequestWithAuthentication.call(this, credentialType, {
		method: 'GET',
		url: `${host}/api/2.0/serving-endpoints`,
		headers: { Accept: 'application/json' },
		json: true,
	})) as {
		endpoints?: Array<{
			name: string;
			config?: {
				served_entities?: Array<{
					external_model?: { name: string };
					foundation_model?: { name: string };
				}>;
			};
		}>;
	};

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
	const credentials = await this.getCredentials<DatabricksCredentials>(credentialType);
	const host = credentials.host.replace(/\/$/, '');

	const response = (await this.helpers.httpRequestWithAuthentication.call(this, credentialType, {
		method: 'GET',
		url: `${host}/api/2.1/unity-catalog/catalogs`,
		headers: { Accept: 'application/json' },
		json: true,
	})) as { catalogs?: Array<{ name: string; comment?: string }> };

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
	const credentials = await this.getCredentials<DatabricksCredentials>(credentialType);
	const host = credentials.host.replace(/\/$/, '');

	let selectedCatalog: string | undefined;
	try {
		const catalogParam = this.getCurrentNodeParameter('catalogName') as unknown;
		selectedCatalog =
			typeof catalogParam === 'object' && catalogParam !== null
				? (catalogParam as { value?: string }).value
				: (catalogParam as string);

		if (selectedCatalog) {
			selectedCatalog = selectedCatalog.trim();
			if (selectedCatalog === '') selectedCatalog = undefined;
		}
	} catch (e) {
		selectedCatalog = undefined;
	}

	if (!selectedCatalog) {
		return { results: [{ name: 'Please Select a Catalog First', value: '' }] };
	}

	try {
		const schemasResponse = (await this.helpers.httpRequestWithAuthentication.call(
			this,
			credentialType,
			{
				method: 'GET',
				url: `${host}/api/2.1/unity-catalog/schemas?catalog_name=${selectedCatalog}`,
				headers: { Accept: 'application/json' },
				json: true,
			},
		)) as { schemas?: Array<{ name: string }> };

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
		return {
			results: [{ name: `Error loading schemas for catalog: ${selectedCatalog}`, value: '' }],
		};
	}
}

export async function getVolumes(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentialType = getActiveCredentialType(this);
	const credentials = await this.getCredentials<DatabricksCredentials>(credentialType);
	const host = credentials.host.replace(/\/$/, '');

	const allVolumes: Array<{ name: string; value: string; description: string; url?: string }> = [];

	const catalogsResponse = (await this.helpers.httpRequestWithAuthentication.call(
		this,
		credentialType,
		{
			method: 'GET',
			url: `${host}/api/2.1/unity-catalog/catalogs`,
			headers: { Accept: 'application/json' },
			json: true,
		},
	)) as { catalogs?: Array<{ name: string }> };

	const catalogs = catalogsResponse.catalogs ?? [];

	for (const catalog of catalogs) {
		try {
			const schemasResponse = (await this.helpers.httpRequestWithAuthentication.call(
				this,
				credentialType,
				{
					method: 'GET',
					url: `${host}/api/2.1/unity-catalog/schemas?catalog_name=${catalog.name}`,
					headers: { Accept: 'application/json' },
					json: true,
				},
			)) as { schemas?: Array<{ name: string }> };

			const schemas = schemasResponse.schemas ?? [];

			for (const schema of schemas) {
				try {
					const volumesResponse = (await this.helpers.httpRequestWithAuthentication.call(
						this,
						credentialType,
						{
							method: 'GET',
							url: `${host}/api/2.1/unity-catalog/volumes?catalog_name=${catalog.name}&schema_name=${schema.name}`,
							headers: { Accept: 'application/json' },
							json: true,
						},
					)) as { volumes?: Array<{ name: string; volume_type?: string }> };

					for (const volume of volumesResponse.volumes ?? []) {
						const fullPath = `${catalog.name}.${schema.name}.${volume.name}`;
						allVolumes.push({
							name: fullPath,
							value: fullPath,
							description: `${catalog.name} / ${schema.name}${volume.volume_type ? ` (${volume.volume_type})` : ''}`,
							url: `${host}/explore/data/${catalog.name}/${schema.name}/${volume.name}`,
						});
					}
				} catch (e) {
					// Skip if can't access volumes in this schema
				}
			}
		} catch (e) {
			// Skip if can't access schemas in this catalog
		}
	}

	if (filter) {
		const filterLower = filter.toLowerCase();
		return {
			results: allVolumes.filter(
				(r) =>
					r.name.toLowerCase().includes(filterLower) ||
					r.description.toLowerCase().includes(filterLower),
			),
		};
	}

	return { results: allVolumes };
}

export async function getTables(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentialType = getActiveCredentialType(this);
	const credentials = await this.getCredentials<DatabricksCredentials>(credentialType);
	const host = credentials.host.replace(/\/$/, '');

	const allTables: Array<{ name: string; value: string; description: string; url?: string }> = [];

	const catalogsResponse = (await this.helpers.httpRequestWithAuthentication.call(
		this,
		credentialType,
		{
			method: 'GET',
			url: `${host}/api/2.1/unity-catalog/catalogs`,
			headers: { Accept: 'application/json' },
			json: true,
		},
	)) as { catalogs?: Array<{ name: string }> };

	const catalogs = catalogsResponse.catalogs ?? [];

	for (const catalog of catalogs) {
		try {
			const schemasResponse = (await this.helpers.httpRequestWithAuthentication.call(
				this,
				credentialType,
				{
					method: 'GET',
					url: `${host}/api/2.1/unity-catalog/schemas?catalog_name=${catalog.name}`,
					headers: { Accept: 'application/json' },
					json: true,
				},
			)) as { schemas?: Array<{ name: string }> };

			const schemas = schemasResponse.schemas ?? [];

			for (const schema of schemas) {
				try {
					const tablesResponse = (await this.helpers.httpRequestWithAuthentication.call(
						this,
						credentialType,
						{
							method: 'GET',
							url: `${host}/api/2.1/unity-catalog/tables?catalog_name=${catalog.name}&schema_name=${schema.name}`,
							headers: { Accept: 'application/json' },
							json: true,
						},
					)) as { tables?: Array<{ name: string; table_type?: string }> };

					for (const table of tablesResponse.tables ?? []) {
						const fullPath = `${catalog.name}.${schema.name}.${table.name}`;
						allTables.push({
							name: fullPath,
							value: fullPath,
							description: `${catalog.name} / ${schema.name}${table.table_type ? ` (${table.table_type})` : ''}`,
							url: `${host}/explore/data/${catalog.name}/${schema.name}/${table.name}`,
						});
					}
				} catch (e) {
					// Skip if can't access tables in this schema
				}
			}
		} catch (e) {
			// Skip if can't access schemas in this catalog
		}
	}

	if (filter) {
		const filterLower = filter.toLowerCase();
		return {
			results: allTables.filter(
				(r) =>
					r.name.toLowerCase().includes(filterLower) ||
					r.description.toLowerCase().includes(filterLower),
			),
		};
	}

	return { results: allTables };
}

export async function getFunctions(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentialType = getActiveCredentialType(this);
	const credentials = await this.getCredentials<DatabricksCredentials>(credentialType);
	const host = credentials.host.replace(/\/$/, '');

	const allFunctions: Array<{ name: string; value: string; description: string; url?: string }> =
		[];

	const catalogsResponse = (await this.helpers.httpRequestWithAuthentication.call(
		this,
		credentialType,
		{
			method: 'GET',
			url: `${host}/api/2.1/unity-catalog/catalogs`,
			headers: { Accept: 'application/json' },
			json: true,
		},
	)) as { catalogs?: Array<{ name: string }> };

	const catalogs = catalogsResponse.catalogs ?? [];

	for (const catalog of catalogs) {
		try {
			const schemasResponse = (await this.helpers.httpRequestWithAuthentication.call(
				this,
				credentialType,
				{
					method: 'GET',
					url: `${host}/api/2.1/unity-catalog/schemas?catalog_name=${catalog.name}`,
					headers: { Accept: 'application/json' },
					json: true,
				},
			)) as { schemas?: Array<{ name: string }> };

			const schemas = schemasResponse.schemas ?? [];

			for (const schema of schemas) {
				try {
					const functionsResponse = (await this.helpers.httpRequestWithAuthentication.call(
						this,
						credentialType,
						{
							method: 'GET',
							url: `${host}/api/2.1/unity-catalog/functions?catalog_name=${catalog.name}&schema_name=${schema.name}`,
							headers: { Accept: 'application/json' },
							json: true,
						},
					)) as { functions?: Array<{ name: string; data_type?: string }> };

					for (const func of functionsResponse.functions ?? []) {
						const fullPath = `${catalog.name}.${schema.name}.${func.name}`;
						allFunctions.push({
							name: fullPath,
							value: fullPath,
							description: `${catalog.name} / ${schema.name}${func.data_type ? ` → ${func.data_type}` : ''}`,
							url: `${host}/explore/data/${catalog.name}/${schema.name}/${func.name}`,
						});
					}
				} catch (e) {
					// Skip if can't access functions in this schema
				}
			}
		} catch (e) {
			// Skip if can't access schemas in this catalog
		}
	}

	if (filter) {
		const filterLower = filter.toLowerCase();
		return {
			results: allFunctions.filter(
				(r) =>
					r.name.toLowerCase().includes(filterLower) ||
					r.description.toLowerCase().includes(filterLower),
			),
		};
	}

	return { results: allFunctions };
}
