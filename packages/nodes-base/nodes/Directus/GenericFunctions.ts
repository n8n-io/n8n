import {
    OptionsWithUri,
} from 'request';

import {
    IExecuteFunctions,
    IExecuteSingleFunctions,
    IHookFunctions,
    ILoadOptionsFunctions,
    IWebhookFunctions,
} from 'n8n-core';

import {
    IBinaryKeyData,
    IDataObject,
    INodeExecutionData,
    IPollFunctions,
    NodeApiError,
    NodeOperationError,
    LoggerProxy as Logger,
} from 'n8n-workflow';

interface IAttachment {
    url: string;
    filename: string;
    type: string;
}

export async function directusApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IWebhookFunctions, method: string, path: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

    const credentials = await this.getCredentials('directusApi') as { url: string; accessToken: string };

    console.log('2. credentials : ', { credentials });
    if (credentials === undefined) {
        throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
    }

    const params = credentials;
    const url = params.url!.replace(/\/$/, "") || null;
    const accessToken = params.accessToken! || null;

    const options: OptionsWithUri = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        qs,
        body,
        uri: uri || `${url}/${path.replace(/^\//, "")}`,
        json: true,
    };

    try {
        options.headers!['Authorization'] = `Bearer ${accessToken}`;
        console.log('3. options : ', { options });
        return await this.helpers.request!(options);
    } catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
};

export async function directusApiRequestAllItems(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, propertyName: string, method: string, resource: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

    const returnData: IDataObject[] = [];

    let responseData;
    query.page = 0;

}

export function validateJSON(json: string | undefined): any { // tslint:disable-line:no-any
    let result;
    try {
        result = JSON.parse(json!);
    } catch (exception) {
        result = undefined;
    }
    return result;
}