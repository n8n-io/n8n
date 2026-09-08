import { NodeApiError } from 'n8n-workflow';
export async function acuitySchedulingApiRequest(method, resource, body = {}, qs = {}, uri, _option = {}) {
    const authenticationMethod = this.getNodeParameter('authentication', 0);
    const options = {
        headers: {
            'Content-Type': 'application/json',
        },
        auth: {},
        method,
        qs,
        body,
        uri: uri || `https://acuityscheduling.com/api/v1${resource}`,
        json: true,
    };
    try {
        if (authenticationMethod === 'apiKey') {
            const credentials = await this.getCredentials('acuitySchedulingApi');
            options.auth = {
                user: credentials.userId,
                password: credentials.apiKey,
            };
            return await this.helpers.request(options);
        }
        else {
            delete options.auth;
            return await this.helpers.requestOAuth2.call(this, 'acuitySchedulingOAuth2Api', options, 
            //@ts-ignore
            true);
        }
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
//# sourceMappingURL=GenericFunctions.js.map