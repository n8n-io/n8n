import { NodeApiError } from 'n8n-workflow';
export const MULTI_STEP_DATE_OPERATORS = new Set([
    'date_is',
    'date_is_not',
    'date_is_before',
    'date_is_on_or_before',
    'date_is_after',
    'date_is_on_or_after',
    'date_is_within',
]);
export const DEPRECATED_TIMEZONE_NUMBER_OPERATORS = new Set([
    'date_within_days',
    'date_within_weeks',
    'date_within_months',
    'date_equals_days_ago',
    'date_equals_months_ago',
    'date_equals_years_ago',
]);
export const DEPRECATED_TIMEZONE_ONLY_OPERATORS = new Set([
    'date_equals_today',
    'date_before_today',
    'date_after_today',
    'date_equals_week',
    'date_equals_month',
    'date_equals_year',
]);
const RELATIVE_DATE_OPERATORS = new Set([
    'today',
    'yesterday',
    'tomorrow',
    'one_week_ago',
    'one_month_ago',
    'one_year_ago',
    'this_week',
    'this_month',
    'this_year',
    'next_week',
    'next_month',
    'next_year',
    'nr_days_ago',
    'nr_weeks_ago',
    'nr_months_ago',
    'nr_years_ago',
    'nr_days_from_now',
    'nr_weeks_from_now',
    'nr_months_from_now',
    'nr_years_from_now',
]);
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
function isFullyFormattedMultiStepValue(value) {
    const parts = value.split('?');
    return parts.length === 3 && parts[2].length > 0;
}
/**
 * Formats filter values for Baserow date operators.
 * Multi-step operators require `{timezone}?{value}?{operator}` (e.g. `UTC?2026-06-17?exact_date`).
 * `date_equals_day_of_month` is not multi-step — pass the day number as-is (e.g. `15`).
 */
export function formatBaserowFilterValue(operator, value, timezone = 'UTC') {
    const trimmed = value.trim();
    if (!trimmed) {
        if (DEPRECATED_TIMEZONE_ONLY_OPERATORS.has(operator)) {
            return timezone;
        }
        return trimmed;
    }
    if (MULTI_STEP_DATE_OPERATORS.has(operator)) {
        const malformedMatch = /^([^?]+)\?\?(\d{4}-\d{2}-\d{2})$/.exec(trimmed);
        if (malformedMatch) {
            return `${malformedMatch[1]}?${malformedMatch[2]}?exact_date`;
        }
        if (isFullyFormattedMultiStepValue(trimmed)) {
            return trimmed;
        }
        if (ISO_DATE_REGEX.test(trimmed)) {
            return `${timezone}?${trimmed}?exact_date`;
        }
        if (RELATIVE_DATE_OPERATORS.has(trimmed)) {
            return `${timezone}??${trimmed}`;
        }
        if (operator === 'date_is_within' && /^\d+$/.test(trimmed)) {
            return `${timezone}?${trimmed}?nr_days_from_now`;
        }
        return trimmed;
    }
    if (DEPRECATED_TIMEZONE_NUMBER_OPERATORS.has(operator)) {
        if (trimmed.includes('?')) {
            return trimmed;
        }
        return `${timezone}?${trimmed}`;
    }
    return trimmed;
}
export function normalizeFilterFieldId(field) {
    return String(field).replace(/^field_/, '');
}
/**
 * Make a request to Baserow API.
 */
export async function baserowApiRequest(method, endpoint, credentialType, body = {}, qs = {}) {
    const credentials = await this.getCredentials(credentialType);
    const host = credentials.host.replace(/\/$/, '');
    const options = {
        method,
        body,
        qs,
        uri: `${host}${endpoint}`,
        json: true,
    };
    if (Object.keys(qs).length === 0) {
        delete options.qs;
    }
    if (Object.keys(body).length === 0) {
        delete options.body;
    }
    try {
        return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
/**
 * Get all results from a paginated query to Baserow API.
 */
export async function baserowApiRequestAllItems(method, endpoint, credentialType, body, qs = {}) {
    const returnData = [];
    let responseData;
    qs.page = 1;
    qs.size = 100;
    const returnAll = this.getNodeParameter('returnAll', 0, false);
    const limit = this.getNodeParameter('limit', 0, 0);
    do {
        responseData = await baserowApiRequest.call(this, method, endpoint, credentialType, body, qs);
        returnData.push.apply(returnData, responseData.results);
        if (!returnAll && returnData.length > limit) {
            return returnData.slice(0, limit);
        }
        qs.page += 1;
    } while (responseData.next !== null);
    return returnData;
}
export async function getFieldNamesAndIds(tableId, credentialType) {
    const endpoint = `/api/database/fields/table/${tableId}/`;
    const response = (await baserowApiRequest.call(this, 'GET', endpoint, credentialType));
    return {
        names: response.map((field) => field.name),
        ids: response.map((field) => `field_${field.id}`),
    };
}
export const toOptions = (items) => items.map(({ name, id }) => ({ name, value: id }));
/**
 * Responsible for mapping field IDs `field_n` to names and vice versa.
 */
export class TableFieldMapper {
    nameToIdMapping = {};
    idToNameMapping = {};
    mapIds = true;
    async getTableFields(table, credentialType) {
        const endpoint = `/api/database/fields/table/${table}/`;
        return await baserowApiRequest.call(this, 'GET', endpoint, credentialType);
    }
    createMappings(tableFields) {
        this.nameToIdMapping = this.createNameToIdMapping(tableFields);
        this.idToNameMapping = this.createIdToNameMapping(tableFields);
    }
    createIdToNameMapping(responseData) {
        return responseData.reduce((acc, cur) => {
            acc[`field_${cur.id}`] = cur.name;
            return acc;
        }, {});
    }
    createNameToIdMapping(responseData) {
        return responseData.reduce((acc, cur) => {
            acc[cur.name] = `field_${cur.id}`;
            return acc;
        }, {});
    }
    setField(field) {
        return this.mapIds ? field : (this.nameToIdMapping[field] ?? field);
    }
    idsToNames(obj) {
        Object.entries(obj).forEach(([key, value]) => {
            if (this.idToNameMapping[key] !== undefined) {
                delete obj[key];
                obj[this.idToNameMapping[key]] = value;
            }
        });
    }
    namesToIds(obj) {
        Object.entries(obj).forEach(([key, value]) => {
            if (this.nameToIdMapping[key] !== undefined) {
                delete obj[key];
                obj[this.nameToIdMapping[key]] = value;
            }
        });
    }
}
//# sourceMappingURL=GenericFunctions.js.map