import { jsonParse, type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';

import { extractResourceLocatorValue, getActiveCredentialType, getHost } from '../helpers';

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const credentialType = getActiveCredentialType(this, i);
	const host = await getHost(this, credentialType);
	const catalogName = extractResourceLocatorValue(this.getNodeParameter('catalogName', i));
	const schemaName = extractResourceLocatorValue(this.getNodeParameter('schemaName', i));
	const tableName = this.getNodeParameter('tableName', i) as string;
	const storageLocation = this.getNodeParameter('storageLocation', i) as string;
	const tableAdditionalFields = this.getNodeParameter('tableAdditionalFields', i, {}) as Record<
		string,
		string
	>;

	const body: Record<string, unknown> = {
		catalog_name: catalogName,
		schema_name: schemaName,
		name: tableName,
		table_type: 'EXTERNAL',
		data_source_format: 'DELTA',
		storage_location: storageLocation,
	};

	if (tableAdditionalFields.columns) {
		const raw = tableAdditionalFields.columns;
		body.columns = typeof raw === 'string' ? jsonParse(raw) : raw;
	}
	if (tableAdditionalFields.comment) body.comment = tableAdditionalFields.comment;

	const response = await this.helpers.httpRequestWithAuthentication.call(this, credentialType, {
		method: 'POST',
		url: `${host}/api/2.1/unity-catalog/tables`,
		body,
		headers: { 'Content-Type': 'application/json' },
		json: true,
	});

	return [{ json: response, pairedItem: { item: i } }];
}
