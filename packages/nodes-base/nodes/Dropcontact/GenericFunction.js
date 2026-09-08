/**
 * Make an authenticated API request to Bubble.
 */
export async function dropcontactApiRequest(method, endpoint, body, qs) {
    const options = {
        method,
        uri: `https://api.dropcontact.io${endpoint}`,
        qs,
        body,
        json: true,
    };
    if (!Object.keys(body).length) {
        delete options.body;
    }
    if (!Object.keys(qs).length) {
        delete options.qs;
    }
    return await this.helpers.requestWithAuthentication.call(this, 'dropcontactApi', options);
}
export function mapPairedItemsFrom(iterable) {
    return Array.from(iterable, (_, i) => i).map((index) => {
        return {
            item: index,
        };
    });
}
//# sourceMappingURL=GenericFunction.js.map