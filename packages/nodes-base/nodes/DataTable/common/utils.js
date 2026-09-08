import { DateTime } from 'luxon';
import { NodeOperationError } from 'n8n-workflow';
import { ALL_CONDITIONS, ANY_CONDITION } from './constants';
import { DATA_TABLE_ID_FIELD, DRY_RUN } from './fields';
function isDateLike(v) {
    return (v !== null && typeof v === 'object' && 'toISOString' in v && typeof v.toISOString === 'function');
}
// Helper function to resolve data table ID from resourceLocator
export async function resolveDataTableId(ctx, resourceLocator) {
    if (resourceLocator.mode === 'name') {
        // Look up table by name
        const aggregateProxy = await getDataTableAggregateProxy(ctx);
        const response = await aggregateProxy.getManyAndCount({
            filter: { name: resourceLocator.value.toLowerCase() },
            take: 1,
        });
        if (response.data.length === 0) {
            throw new NodeOperationError(ctx.getNode(), `Data table with name "${resourceLocator.value}" not found`);
        }
        return response.data[0].id;
    }
    else {
        // For 'list' and 'id' modes, use the value from the resource locator
        return resourceLocator.value;
    }
}
// We need two functions here since the available getNodeParameter
// overloads vary with the index
export async function getDataTableProxyExecute(ctx, index = 0) {
    if (ctx.helpers.getDataTableProxy === undefined)
        throw new NodeOperationError(ctx.getNode(), 'Attempted to use Data table node but the module is disabled');
    const resourceLocator = ctx.getNodeParameter(DATA_TABLE_ID_FIELD, index);
    const dataTableId = await resolveDataTableId(ctx, resourceLocator);
    return await ctx.helpers.getDataTableProxy(dataTableId);
}
export async function getDataTableProxyLoadOptions(ctx) {
    if (ctx.helpers.getDataTableProxy === undefined)
        throw new NodeOperationError(ctx.getNode(), 'Attempted to use Data table node but the module is disabled');
    const resourceLocator = ctx.getNodeParameter(DATA_TABLE_ID_FIELD);
    if (!resourceLocator || !resourceLocator.value) {
        return;
    }
    const dataTableId = await resolveDataTableId(ctx, resourceLocator);
    return await ctx.helpers.getDataTableProxy(dataTableId);
}
export async function getDataTableAggregateProxy(ctx) {
    if (ctx.helpers.getDataTableAggregateProxy === undefined)
        throw new NodeOperationError(ctx.getNode(), 'Attempted to use Data table node but the module is disabled');
    return await ctx.helpers.getDataTableAggregateProxy();
}
export function isFieldEntry(obj) {
    if (obj === null || typeof obj !== 'object')
        return false;
    return 'keyName' in obj; // keyValue and condition are optional
}
export function isMatchType(obj) {
    return typeof obj === 'string' && (obj === ANY_CONDITION || obj === ALL_CONDITIONS);
}
export function buildGetManyFilter(fieldEntries, matchType, columnTypeMap, node) {
    const filters = fieldEntries.map((x) => {
        switch (x.condition) {
            case 'isEmpty':
                return {
                    columnName: x.keyName,
                    condition: 'eq',
                    value: null,
                };
            case 'isNotEmpty':
                return {
                    columnName: x.keyName,
                    condition: 'neq',
                    value: null,
                };
            case 'isTrue':
                return {
                    columnName: x.keyName,
                    condition: 'eq',
                    value: true,
                };
            case 'isFalse':
                return {
                    columnName: x.keyName,
                    condition: 'eq',
                    value: false,
                };
            default: {
                let value = x.keyValue;
                const columnType = columnTypeMap[x.keyName];
                // Convert ISO date strings to Date objects for date columns
                if (columnType === 'date' && typeof value === 'string') {
                    const parsed = new Date(value);
                    if (isNaN(parsed.getTime())) {
                        throw new NodeOperationError(node, `Invalid date string '${value}' for column '${x.keyName}'`);
                    }
                    value = parsed;
                }
                return {
                    columnName: x.keyName,
                    condition: x.condition ?? 'eq',
                    value,
                };
            }
        }
    });
    return { type: matchType === ALL_CONDITIONS ? 'and' : 'or', filters };
}
export function isFieldArray(value) {
    return (value !== null && typeof value === 'object' && Array.isArray(value) && value.every(isFieldEntry));
}
export function dataObjectToApiInput(data, node, row) {
    return Object.fromEntries(Object.entries(data).map(([k, v]) => {
        if (v === undefined || v === null)
            return [k, null];
        if (Array.isArray(v)) {
            throw new NodeOperationError(node, `unexpected array input '${JSON.stringify(v)}' in row ${row}`);
        }
        if (v instanceof Date) {
            return [k, v];
        }
        if (typeof v === 'object') {
            // Luxon DateTime
            if (DateTime.isDateTime(v)) {
                return [k, v.toJSDate()];
            }
            if (isDateLike(v)) {
                try {
                    const dateObj = new Date(v.toISOString());
                    if (isNaN(dateObj.getTime())) {
                        throw new Error('Invalid date');
                    }
                    return [k, dateObj];
                }
                catch {
                    // Fall through
                }
            }
            throw new NodeOperationError(node, `unexpected object input '${JSON.stringify(v)}' in row ${row}`);
        }
        return [k, v];
    }));
}
export function getDryRunParameter(ctx, index) {
    const dryRun = ctx.getNodeParameter(`options.${DRY_RUN.name}`, index, false);
    if (typeof dryRun !== 'boolean') {
        throw new NodeOperationError(ctx.getNode(), `unexpected input ${JSON.stringify(dryRun)} for boolean dryRun`);
    }
    return dryRun;
}
//# sourceMappingURL=utils.js.map