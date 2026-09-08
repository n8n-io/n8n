export async function customerIoApiRequest(method, endpoint, body, baseApi, _query) {
    const credentials = await this.getCredentials('customerIoApi');
    const region = credentials.region;
    const isEu = region === 'track-eu.customer.io';
    const options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        body,
        url: '',
        json: true,
    };
    if (baseApi === 'tracking') {
        options.url = `https://${region}/api/v1${endpoint}`;
    }
    else if (baseApi === 'app') {
        const appHost = isEu ? 'api-eu.customer.io' : 'api.customer.io';
        options.url = `https://${appHost}/v1${endpoint}`;
    }
    return await this.helpers.requestWithAuthentication.call(this, 'customerIoApi', options);
}
/** Convert dot-separated event names to underscore-separated API format */
export function toApiEventName(event) {
    return event.replaceAll('.', '_');
}
/** Check if all current events exist in the webhook's event list */
export function eventExists(currentEvents, webhookEvents) {
    const webhookEventSet = new Set(webhookEvents);
    return currentEvents.every((event) => webhookEventSet.has(toApiEventName(event)));
}
export function validateJSON(json) {
    let result;
    try {
        result = JSON.parse(json);
    }
    catch (exception) {
        result = undefined;
    }
    return result;
}
//# sourceMappingURL=GenericFunctions.js.map