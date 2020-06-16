import { OptionsWithUri } from 'request';
import { IDataObject, INodeExecutionData, IBinaryData } from 'n8n-workflow';
import {
    IExecuteFunctions,
    BINARY_ENCODING
} from 'n8n-core';
import {
    IBoxApiCopyFileOptions,
    IBoxApiDownloadFileOptions,
    IBoxApiModifyFileOptions,
    IBoxApiDeleteOptions,
    ICopyFile,
    IModifyFile,
    IFileCopySuccessful,
    IFileModifySuccessful,
    IFileDeleteSuccessful,
    IBoxFileEntry
} from '../interfaces/index';
import {
    boxApiBaseUri
} from '../box.constants';

import {
    boxApiErrorMessages
} from '../box.messages'

export async function downloadFile(accessToken: string, baseFunctions: IExecuteFunctions, apiOptions: IBoxApiDownloadFileOptions): Promise<IBinaryData> {
    let responseData = {};
    let requestMethod = 'GET';
    let isJson = true;
    let headers: IDataObject;
    headers = {
        'Authorization': `Bearer ${accessToken}`
    };
    if (apiOptions.file && apiOptions.destination) {
        let endpoint = boxApiBaseUri + 'files' + `/${apiOptions.file}/content`;

        const options: OptionsWithUri = {
            headers,
            method: requestMethod,
            qs: {},
            uri: endpoint,
            json: isJson,
            body: {},
            encoding: null
        };

        try {
            responseData = await baseFunctions.helpers.request(options);

            const data = Buffer.from(responseData as string);

            return await baseFunctions.helpers.prepareBinaryData(data, undefined, undefined);
        }
        catch (error) {

            if (error.statusCode === 401) {
                throw new Error(boxApiErrorMessages.CredentialsNotFoundError);
            }

            if (error.statusCode === 404) {
                throw new Error(boxApiErrorMessages.FileNotFoundError);
            }

            if (error.statusCode === 202) {
                throw new Error(boxApiErrorMessages.FileRetryError);
            }

            if (error.statusCode === 403) {
                throw new Error(boxApiErrorMessages.InvalidPermissionsError);
            }

            if (error.statusCode === 503) {
                throw new Error(boxApiErrorMessages.LongRunningProcessError);
            }

            if (error.error && error.error.error_summary) {
                throw new Error(`Box error response [${error.statusCode}]: ${error.error.error_summary}`);
            }
        }
    } else {
        throw new Error(boxApiErrorMessages.InvalidParamsError);
    }

    return baseFunctions.helpers.prepareBinaryData(responseData as unknown as Buffer, undefined, undefined);
}

export async function copyFile(accessToken: string, baseFunctions: IExecuteFunctions, apiOptions: IBoxApiCopyFileOptions): Promise<IFileCopySuccessful> {
    let responseData = {};
    let requestMethod = 'POST';
    let isJson = true;
    let headers: IDataObject;
    headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    };
    if (apiOptions && apiOptions.parent && apiOptions.name && apiOptions.file) {
        let endpoint = boxApiBaseUri + 'files' + `/${apiOptions.file}/copy`;
        let body: ICopyFile = {
            name: apiOptions.name,
            parent: { id: apiOptions.parent }
        };

        if (apiOptions.version) {
            body.version = apiOptions.version
        }
        const options: OptionsWithUri = {
            headers,
            method: requestMethod,
            qs: {},
            uri: endpoint,
            json: isJson,
            body: body
        };

        try {
            responseData = await baseFunctions.helpers.request(options);
            let folder = responseData as IBoxFileEntry;
            return { success: true } as IFileCopySuccessful;
        }
        catch (error) {

            if (error.statusCode === 401) {
                throw new Error(boxApiErrorMessages.CredentialsNotFoundError);
            }

            if (error.statusCode === 409 && error.error.code === 'item_name_in_use') {
                throw new Error(boxApiErrorMessages.DuplicateFileNameError);
            }

            if (error.statusCode === 409 && error.error.code === 'operation_blocked_temporary') {
                throw new Error(boxApiErrorMessages.OperationBlockedError);
            }

            if (error.statusCode === 404) {
                throw new Error(boxApiErrorMessages.FileNotFoundError);
            }

            if (error.statusCode === 403) {
                throw new Error(boxApiErrorMessages.InvalidPermissionsError);
            }

            if (error.error && error.error.error_summary) {
                throw new Error(`Box error response [${error.statusCode}]: ${error.error.error_summary}`);
            }
        }
    } else {
        throw new Error(boxApiErrorMessages.InvalidParamsError);
    }

    return responseData as IFileCopySuccessful;
}

export async function modifyFile(accessToken: string, baseFunctions: IExecuteFunctions, apiOptions: IBoxApiModifyFileOptions): Promise<IFileModifySuccessful> {
    let responseData = {};
    let requestMethod = 'PUT';
    let isJson = true;
    let headers: IDataObject;
    headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    };
    if (apiOptions && apiOptions.parent && apiOptions.name && apiOptions.file) {
        let endpoint = boxApiBaseUri + 'files' + `/${apiOptions.file}`;
        let body: IModifyFile = {
            name: apiOptions.name,
            parent: { id: apiOptions.parent },
            description: apiOptions.description
        };

        const options: OptionsWithUri = {
            headers,
            method: requestMethod,
            qs: {},
            uri: endpoint,
            json: isJson,
            body: body
        };

        try {
            responseData = await baseFunctions.helpers.request(options);
            let folder = responseData as IBoxFileEntry;
            return { success: true } as IFileModifySuccessful;
        }
        catch (error) {

            if (error.statusCode === 401) {
                throw new Error(boxApiErrorMessages.CredentialsNotFoundError);
            }

            if (error.statusCode === 409 && error.error.code === 'item_name_in_use') {
                throw new Error(boxApiErrorMessages.DuplicateFileNameError);
            }

            if (error.statusCode === 409 && error.error.code === 'operation_blocked_temporary') {
                throw new Error(boxApiErrorMessages.OperationBlockedError);
            }

            if (error.statusCode === 404) {
                throw new Error(boxApiErrorMessages.FileNotFoundError);
            }

            if (error.statusCode === 403) {
                throw new Error(boxApiErrorMessages.InvalidPermissionsError);
            }

            if (error.error && error.error.error_summary) {
                throw new Error(`Box error response [${error.statusCode}]: ${error.error.error_summary}`);
            }
        }
    } else {
        throw new Error(boxApiErrorMessages.InvalidParamsError);
    }

    return responseData as IFileModifySuccessful;
}

export async function deleteFile(accessToken: string, baseFunctions: IExecuteFunctions, apiOptions: IBoxApiDeleteOptions): Promise<IFileDeleteSuccessful> {
    let responseData = {};
    let requestMethod = 'DELETE';
    let isJson = true;
    let headers: IDataObject;
    headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    };
    if (apiOptions && apiOptions.file) {
        let endpoint = boxApiBaseUri + 'files' + `/${apiOptions.file}`;
        const options: OptionsWithUri = {
            headers,
            method: requestMethod,
            qs: {},
            uri: endpoint,
            json: isJson,
            body: {}
        };

        try {
            responseData = await baseFunctions.helpers.request(options);
            return { success: true } as IFileDeleteSuccessful;
        }
        catch (error) {

            if (error.statusCode === 401) {
                throw new Error(boxApiErrorMessages.CredentialsNotFoundError);
            }

            if (error.statusCode === 409 && error.error.code === 'operation_blocked_temporary') {
                throw new Error(boxApiErrorMessages.OperationBlockedError);
            }

            if (error.statusCode === 404) {
                throw new Error(boxApiErrorMessages.FileNotFoundError);
            }

            if (error.statusCode === 403) {
                throw new Error(boxApiErrorMessages.InvalidPermissionsError);
            }

            if (error.statusCode === 503) {
                throw new Error(boxApiErrorMessages.LongRunningProcessError);
            }

            if (error.error && error.error.error_summary) {
                throw new Error(`Box error response [${error.statusCode}]: ${error.error.error_summary}`);
            }
        }
    } else {
        throw new Error(boxApiErrorMessages.InvalidParamsError);
    }

    return responseData as IFileDeleteSuccessful;
}