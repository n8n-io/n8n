import { NodeOperationError } from 'n8n-workflow';
import { apiRequest } from '../transport';
export async function baseSearch(filter, paginationToken) {
    let qs;
    if (paginationToken) {
        qs = {
            offset: paginationToken,
        };
    }
    const response = await apiRequest.call(this, 'GET', 'meta/bases', undefined, qs);
    if (filter) {
        const results = [];
        for (const base of response.bases || []) {
            if (base.name?.toLowerCase().includes(filter.toLowerCase())) {
                results.push({
                    name: base.name,
                    value: base.id,
                    url: `https://airtable.com/${base.id}`,
                });
            }
        }
        return {
            results,
            paginationToken: response.offset,
        };
    }
    else {
        return {
            results: (response.bases || []).map((base) => ({
                name: base.name,
                value: base.id,
                url: `https://airtable.com/${base.id}`,
            })),
            paginationToken: response.offset,
        };
    }
}
export async function tableSearch(filter, paginationToken) {
    const baseId = this.getNodeParameter('base', undefined, {
        extractValue: true,
    });
    let qs;
    if (paginationToken) {
        qs = {
            offset: paginationToken,
        };
    }
    const response = await apiRequest.call(this, 'GET', `meta/bases/${baseId}/tables`, undefined, qs);
    if (filter) {
        const results = [];
        for (const table of response.tables || []) {
            if (table.name?.toLowerCase().includes(filter.toLowerCase())) {
                results.push({
                    name: table.name,
                    value: table.id,
                    url: `https://airtable.com/${baseId}/${table.id}`,
                });
            }
        }
        return {
            results,
            paginationToken: response.offset,
        };
    }
    else {
        return {
            results: (response.tables || []).map((table) => ({
                name: table.name,
                value: table.id,
                url: `https://airtable.com/${baseId}/${table.id}`,
            })),
            paginationToken: response.offset,
        };
    }
}
export async function viewSearch(filter) {
    const baseId = this.getNodeParameter('base', undefined, {
        extractValue: true,
    });
    const tableId = encodeURI(this.getNodeParameter('table', undefined, {
        extractValue: true,
    }));
    const response = await apiRequest.call(this, 'GET', `meta/bases/${baseId}/tables`);
    const tableData = (response.tables || []).find((table) => {
        return table.id === tableId;
    });
    if (!tableData) {
        throw new NodeOperationError(this.getNode(), 'Table information could not be found!', {
            level: 'warning',
        });
    }
    if (filter) {
        const results = [];
        for (const view of tableData.views || []) {
            if (view.name?.toLowerCase().includes(filter.toLowerCase())) {
                results.push({
                    name: view.name,
                    value: view.id,
                    url: `https://airtable.com/${baseId}/${tableId}/${view.id}`,
                });
            }
        }
        return {
            results,
        };
    }
    else {
        return {
            results: (tableData.views || []).map((view) => ({
                name: view.name,
                value: view.id,
                url: `https://airtable.com/${baseId}/${tableId}/${view.id}`,
            })),
        };
    }
}
//# sourceMappingURL=listSearch.js.map