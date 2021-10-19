import { OptionsWithUri } from 'request';

import {
    IExecuteFunctions,
    IExecuteSingleFunctions,
    IHookFunctions,
    ILoadOptionsFunctions,
    IWebhookFunctions
} from 'n8n-core';

import {
    IBinaryKeyData,
    IBinaryData,
    IDataObject,
    INodeExecutionData,
    IPollFunctions,
    //    NodeApiError,
    //    NodeOperationError,
    LoggerProxy as Logger
} from 'n8n-workflow';

interface IAttachment {
    url: string;
    filename: string;
    type: string;
}

export async function directusApiRequest(
    this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IWebhookFunctions,
    method: string,
    path: string,
    body: any = {},
    qs: IDataObject = {},
    uri?: string,
    option: IDataObject = {}
): Promise<any> {
    // tslint:disable-line:no-any

    const credentials = (await this.getCredentials('directusApi')) as {
        url: string;
        accessToken: string;
    };

    console.log('2. credentials : ', { credentials });
    if (credentials === undefined) {
        /*
        throw new NodeOperationError(
            this.getNode(),
            'No credentials got returned!'
        );
        */
        throw new Error('No credentials got returned!');
    }

    const params = credentials;
    const url = params.url!.replace(/\/$/, '') || null;
    const accessToken = params.accessToken! || null;

    const options: OptionsWithUri = {
        headers: {
            'Content-Type': 'application/json'
        },
        method,
        qs,
        body,
        uri: uri || `${url}/${path.replace(/^\//, '')}`,
        json: true
    };

    try {
        options.headers!['Authorization'] = accessToken ? `Bearer ${accessToken}` : "";
        console.log('3. options : ', { options });
        return await this.helpers.request!(options);
    } catch (error) {
        //throw new NodeApiError(this.getNode(), error);
        throw new Error(error);
    }
}

export function validateJSON(json: string | undefined): any {
    // tslint:disable-line:no-any
    let result;
    try {
        result = JSON.parse(json!);
    } catch (exception) {
        result = undefined;
    }
    return result;
}

export async function directusApiAssetRequest(
    this: IExecuteFunctions | IExecuteSingleFunctions,
    method: string,
    path: string,
    ID: string,
    dataPropertyName: string,
    qs: IDataObject = {}
): Promise<any> {
    // tslint:disable-line:no-any

    const credentials = (await this.getCredentials('directusApi')) as {
        url: string;
        accessToken: string;
    };

    if (credentials === undefined) {
        /*
        throw new NodeOperationError(
            this.getNode(),
            'No credentials got returned!'
        );
        */
        throw new Error('No credentials got returned!');
    }

    const params = credentials;
    const url = params.url!.replace(/\/$/, '') || null;
    const accessToken = params.accessToken! || null;

    const optionsFile: OptionsWithUri = {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
        },
        method,
        qs,
        uri: `${url}/files/${ID}`,
        json: true
    };
    console.log('3. optionsFile : ', { optionsFile });

    const optionsAsset: OptionsWithUri = {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
        },
        method,
        qs,
        uri: `${url}/${path.replace(/^\//, '')}`,
        json: true,
        encoding: null, //"arrayBuffer",
    };
    console.log('4. optionsAsset : ', { optionsAsset });

    try {
        const resFile = await this.helpers.request!(optionsFile);
        const file = resFile.data;

        const res: any = await this.helpers.request!(optionsAsset);
        const binaryData = Buffer.from(res);

        console.log(file);
        const binary: IBinaryKeyData = {};
        binary![dataPropertyName] = await this.helpers.prepareBinaryData(
            binaryData,
            file.filename_download,
            file.type
        );

        const json = { file };
        const result: INodeExecutionData = {
            json,
            binary
        };
        return result;
    } catch (error) {
        //throw new NodeApiError(this.getNode(), error);
        throw new Error(error);
    }
}

/// To: 1.) Create a new File (including file content), 2.) Update a file (file content or file object)
export async function directusApiFileRequest(
    this: IExecuteFunctions | IExecuteSingleFunctions | IWebhookFunctions,
    method: string,
    path: string,
    formData: any = {},
    body: any = {},
    qs: IDataObject = {},
    uri?: string,
    option: IDataObject = {}
): Promise<any> {
    // tslint:disable-line:no-any

    const credentials = (await this.getCredentials('directusApi')) as {
        url: string;
        accessToken: string;
    };

    if (credentials === undefined) {
        /*
        throw new NodeOperationError(
            this.getNode(),
            'No credentials got returned!'
        );
        */
        throw new Error('No credentials got returned!');
    }

    const params = credentials;
    const url = params.url!.replace(/\/$/, '') || null;
    const accessToken = params.accessToken! || null;

    const optionsFormData: OptionsWithUri = {
        headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${accessToken}`
        },
        method,
        qs,
        formData,
        uri: uri || `${url}/${path}`
    };
    const responseFile = {};

    try {
        if (method == 'POST') {
            // 1. Create a file with content

            const response = await this.helpers.request!(optionsFormData);
            const file = JSON.parse(response).data;

            // 2. Update the file object with fileObject properties
            let res = await directusApiRequest.call(
                this,
                'PATCH',
                `files/${file.id}`,
                body
            );
            Object.assign(responseFile, res);
        }
        if (method == 'PATCH') {
            // 1. Check if formdata and/or body are provided
            const isForm = ((Object.keys(formData).length > 0) as boolean) ?? false;
            const isBody = ((Object.keys(body).length > 0) as boolean) ?? false;

            // 2. Sequentially, update them both
            if (isForm) {
                const options: OptionsWithUri = {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${accessToken}`
                    },
                    method,
                    qs,
                    formData,
                    uri: uri || `${url}/${path}`
                };

                const response = await this.helpers.request!(optionsFormData);
                const file = JSON.parse(response).data;
                Object.assign(responseFile, file);
            }
            if (isBody) {
                let res = await directusApiRequest.call(
                    this,
                    'PATCH',
                    path,
                    body
                );
                Object.assign(responseFile, res);
            }
        }
        // 3. Return the final result
        return responseFile;

    } catch (error) {
        //throw new NodeApiError(this.getNode(), error);
        throw new Error(error);
    }
}
