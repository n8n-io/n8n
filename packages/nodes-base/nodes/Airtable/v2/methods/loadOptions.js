import { NodeOperationError } from 'n8n-workflow';
import { apiRequest } from '../transport';
export async function getColumns() {
    const base = this.getNodeParameter('base', undefined, {
        extractValue: true,
    });
    const tableId = encodeURI(this.getNodeParameter('table', undefined, {
        extractValue: true,
    }));
    const response = await apiRequest.call(this, 'GET', `meta/bases/${base}/tables`);
    const tableData = (response.tables || []).find((table) => {
        return table.id === tableId;
    });
    if (!tableData) {
        throw new NodeOperationError(this.getNode(), 'Table information could not be found!', {
            level: 'warning',
        });
    }
    const result = [];
    for (const field of tableData.fields) {
        result.push({
            name: field.name,
            value: field.name,
            description: `Type: ${field.type}`,
        });
    }
    return result;
}
export async function getColumnsWithRecordId() {
    const returnData = await getColumns.call(this);
    return [
        {
            // eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased-id, n8n-nodes-base/node-param-display-name-miscased
            name: 'id',
            value: 'id',
            description: 'Type: primaryFieldId',
        },
        ...returnData,
    ];
}
export async function getColumnsWithoutColumnToMatchOn() {
    const columnToMatchOn = this.getNodeParameter('columnToMatchOn');
    const returnData = await getColumns.call(this);
    return returnData.filter((column) => column.value !== columnToMatchOn);
}
export async function getAttachmentColumns() {
    const base = this.getNodeParameter('base', undefined, {
        extractValue: true,
    });
    const tableId = encodeURI(this.getNodeParameter('table', undefined, {
        extractValue: true,
    }));
    const response = await apiRequest.call(this, 'GET', `meta/bases/${base}/tables`);
    const tableData = (response.tables || []).find((table) => {
        return table.id === tableId;
    });
    if (!tableData) {
        throw new NodeOperationError(this.getNode(), 'Table information could not be found!', {
            level: 'warning',
        });
    }
    const result = [];
    for (const field of tableData.fields) {
        if (!field.type?.toLowerCase()?.includes('attachment')) {
            continue;
        }
        result.push({
            name: field.name,
            value: field.name,
            description: `Type: ${field.type}`,
        });
    }
    return result;
}
//# sourceMappingURL=loadOptions.js.map