import { jsonParse, type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';

import { getActiveCredentialType, getHost } from '../helpers';

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const credentialType = getActiveCredentialType(this, i);
	const host = await getHost(this, credentialType);
	const indexName = this.getNodeParameter('indexName', i) as string;
	const endpointName = this.getNodeParameter('endpointName', i) as string;
	const primaryKey = this.getNodeParameter('primaryKey', i) as string;
	const indexType = this.getNodeParameter('indexType', i) as string;

	const body: Record<string, unknown> = {
		name: indexName,
		endpoint_name: endpointName,
		primary_key: primaryKey,
		index_type: indexType,
	};

	if (indexType === 'DELTA_SYNC') {
		const raw = this.getNodeParameter('deltaSyncIndexSpec', i) as string;
		body.delta_sync_index_spec = typeof raw === 'string' ? jsonParse(raw) : raw;
	} else if (indexType === 'DIRECT_ACCESS') {
		const raw = this.getNodeParameter('directAccessIndexSpec', i) as string;
		body.direct_access_index_spec = typeof raw === 'string' ? jsonParse(raw) : raw;
	}

	const response = await this.helpers.httpRequestWithAuthentication.call(this, credentialType, {
		method: 'POST',
		url: `${host}/api/2.0/vector-search/indexes`,
		body,
		json: true,
	});

	return [{ json: response, pairedItem: { item: i } }];
}
