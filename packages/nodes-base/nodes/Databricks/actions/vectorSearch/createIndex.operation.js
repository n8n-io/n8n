import { jsonParse } from 'n8n-workflow';
import { databricksApiRequest, getActiveCredentialType, getHost } from '../helpers';
export async function execute(i) {
    const credentialType = getActiveCredentialType(this, i);
    const host = await getHost(this, credentialType);
    const indexName = this.getNodeParameter('indexName', i);
    const endpointName = this.getNodeParameter('endpointName', i);
    const primaryKey = this.getNodeParameter('primaryKey', i);
    const indexType = this.getNodeParameter('indexType', i);
    const body = {
        name: indexName,
        endpoint_name: endpointName,
        primary_key: primaryKey,
        index_type: indexType,
    };
    if (indexType === 'DELTA_SYNC') {
        const raw = this.getNodeParameter('deltaSyncIndexSpec', i);
        body.delta_sync_index_spec = typeof raw === 'string' ? jsonParse(raw) : raw;
    }
    else if (indexType === 'DIRECT_ACCESS') {
        const raw = this.getNodeParameter('directAccessIndexSpec', i);
        body.direct_access_index_spec = typeof raw === 'string' ? jsonParse(raw) : raw;
    }
    const response = await databricksApiRequest(this, credentialType, {
        method: 'POST',
        url: `${host}/api/2.0/vector-search/indexes`,
        body,
        json: true,
    });
    return [{ json: response, pairedItem: { item: i } }];
}
//# sourceMappingURL=createIndex.operation.js.map