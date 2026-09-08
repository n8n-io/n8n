import { jsonParse } from 'n8n-workflow';
import { databricksApiRequest, extractResourceLocatorValue, getActiveCredentialType, getHost, } from '../helpers';
export async function execute(i) {
    const credentialType = getActiveCredentialType(this, i);
    const host = await getHost(this, credentialType);
    const catalogName = extractResourceLocatorValue(this.getNodeParameter('catalogName', i));
    const schemaName = extractResourceLocatorValue(this.getNodeParameter('schemaName', i));
    const tableName = this.getNodeParameter('tableName', i);
    const storageLocation = this.getNodeParameter('storageLocation', i);
    const tableAdditionalFields = this.getNodeParameter('tableAdditionalFields', i, {});
    const body = {
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
    if (tableAdditionalFields.comment)
        body.comment = tableAdditionalFields.comment;
    const response = await databricksApiRequest(this, credentialType, {
        method: 'POST',
        url: `${host}/api/2.1/unity-catalog/tables`,
        body,
        headers: { 'Content-Type': 'application/json' },
        json: true,
    });
    return [{ json: response, pairedItem: { item: i } }];
}
//# sourceMappingURL=createTable.operation.js.map