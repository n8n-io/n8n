import { createHash } from 'crypto';
import flow from 'lodash/flow';
import omit from 'lodash/omit';
import { NodeApiError } from 'n8n-workflow';
/**
 * Make an authenticated API request to Copper.
 */
export async function copperApiRequest(method, resource, body = {}, qs = {}, uri = '', option = {}) {
    let options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        qs,
        body,
        url: uri || `https://api.copper.com/developer_api/v1${resource}`,
        json: true,
    };
    options = Object.assign({}, options, option);
    if (!Object.keys(qs).length) {
        delete options.qs;
    }
    if (Object.keys(options.body).length === 0) {
        delete options.body;
    }
    try {
        return await this.helpers.requestWithAuthentication.call(this, 'copperApi', options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
/**
 * Creates a secret from the credentials
 *
 */
export function getAutomaticSecret(credentials) {
    const data = `${credentials.email},${credentials.apiKey}`;
    return createHash('md5').update(data).digest('hex');
}
export function adjustAddress(fixedCollection) {
    if (!fixedCollection.address)
        return fixedCollection;
    const adjusted = omit(fixedCollection, ['address']);
    if (fixedCollection.address) {
        adjusted.address = fixedCollection.address.addressFields;
    }
    return adjusted;
}
export function adjustPhoneNumbers(fixedCollection) {
    if (!fixedCollection.phone_numbers)
        return fixedCollection;
    const adjusted = omit(fixedCollection, ['phone_numbers']);
    if (fixedCollection.phone_numbers) {
        adjusted.phone_numbers = fixedCollection.phone_numbers.phoneFields;
    }
    return adjusted;
}
export function adjustEmails(fixedCollection) {
    if (!fixedCollection.emails)
        return fixedCollection;
    const adjusted = omit(fixedCollection, ['emails']);
    if (fixedCollection.emails) {
        adjusted.emails = fixedCollection.emails.emailFields;
    }
    return adjusted;
}
export function adjustProjectIds(fields) {
    if (!fields.project_ids)
        return fields;
    const adjusted = omit(fields, ['project_ids']);
    adjusted.project_ids = fields.project_ids.includes(',')
        ? fields.project_ids.split(',')
        : [fields.project_ids];
    return adjusted;
}
export function adjustEmail(fixedCollection) {
    if (!fixedCollection.email)
        return fixedCollection;
    const adjusted = omit(fixedCollection, ['email']);
    if (fixedCollection.email) {
        adjusted.email = fixedCollection.email.emailFields;
    }
    return adjusted;
}
export const adjustCompanyFields = flow(adjustAddress, adjustPhoneNumbers);
export const adjustLeadFields = flow(adjustCompanyFields, adjustEmail);
export const adjustPersonFields = flow(adjustCompanyFields, adjustEmails);
export const adjustTaskFields = flow(adjustLeadFields, adjustProjectIds);
/**
 * Make an authenticated API request to Copper and return all items.
 */
export async function copperApiRequestAllItems(method, resource, body = {}, qs = {}, uri = '', option = {}) {
    let responseData;
    qs.page_size = 200;
    let totalItems = 0;
    const returnData = [];
    do {
        responseData = await copperApiRequest.call(this, method, resource, body, qs, uri, option);
        totalItems = responseData.headers['x-pw-total'];
        returnData.push(...responseData.body);
    } while (totalItems > returnData.length);
    return returnData;
}
/**
 * Handle a Copper listing by returning all items or up to a limit.
 */
export async function handleListing(method, endpoint, qs = {}, body = {}, uri = '') {
    const returnAll = this.getNodeParameter('returnAll', 0);
    const option = { resolveWithFullResponse: true };
    if (returnAll) {
        return await copperApiRequestAllItems.call(this, method, endpoint, body, qs, uri, option);
    }
    const limit = this.getNodeParameter('limit', 0);
    const responseData = await copperApiRequestAllItems.call(this, method, endpoint, body, qs, uri, option);
    return responseData.slice(0, limit);
}
//# sourceMappingURL=GenericFunctions.js.map