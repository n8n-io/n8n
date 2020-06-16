import { OptionsWithUri } from 'request';
import { IDataObject } from 'n8n-workflow';
import {
    IExecuteFunctions
} from 'n8n-core';
import {
    IBoxApiFolderOptions,
    IBoxFolderResponse,
    IBoxApiAddFolderOptions,
    IBoxApiCopyFolderOptions,
    IAddFolder,
    ICopyFolder,
    IModifyFolder,
    IBoxApiDeleteFolderOptions,
    IFolderCopySuccessful,
    IBoxFolderEntry,
    IFolderDeleteSuccessful,
    IBoxApiModifyFolderOptions,
    IFolderModifySuccessful
} from '../interfaces/index';
import {
    boxApiBaseUri
} from '../box.constants';

import {
    boxApiErrorMessages
} from '../box.messages'

export async function fetchFolders(accessToken: string, baseFunctions: IExecuteFunctions, apiOptions: IBoxApiFolderOptions): Promise<IBoxFolderResponse> {
    let responseData = {};
    let requestMethod = 'GET';
    let isJson = true;
    let headers: IDataObject;
    let body = {};
    headers = {
        'Authorization': `Bearer ${accessToken}`,
    };
    let endpoint = boxApiBaseUri + 'folders/0';

    if (apiOptions) {
        if (apiOptions.offset > 0 && apiOptions.limit > 0) {
            endpoint = endpoint + `?offset=${apiOptions.offset}&&limit=${apiOptions.limit}`;
        }
        else if (apiOptions.limit > 0) {
            endpoint = endpoint + `?limit=${apiOptions.limit}`;
        } else if (apiOptions.offset > 0) {
            endpoint = endpoint + `?offset=${apiOptions.offset}`;
        }
    }

    const options: OptionsWithUri = {
        headers,
        method: requestMethod,
        qs: {},
        uri: endpoint,
        json: isJson,
    };

    if (Object.keys(body).length) {
        options.body = body;
    }


    try {
        responseData = await baseFunctions.helpers.request(options);
        return { item_collection: (responseData as IBoxFolderResponse).item_collection };
    }
    catch (error) {
        if (error.statusCode === 401) {
            throw new Error(boxApiErrorMessages.CredentialsNotFoundError);
        }

        if (error.error && error.error.error_summary) {
            throw new Error(`Box error response [${error.statusCode}]: ${error.error.error_summary}`);
        }
        throw error;
    }
}

export async function addFolder(accessToken: string, baseFunctions: IExecuteFunctions, apiOptions: IBoxApiAddFolderOptions): Promise<IBoxFolderEntry> {
    let responseData = {};
    let requestMethod = 'POST';
    let isJson = true;
    let headers: IDataObject;
    headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    };
    let endpoint = boxApiBaseUri + 'folders';
    if (apiOptions && apiOptions.name && apiOptions.parent) {
        let body: IAddFolder = {
            name: apiOptions.name,
            parent: { id: apiOptions.parent }
        };
        if (apiOptions.folderUploadEmail) {
            body.folder_upload_email = { access: apiOptions.folderUploadEmail };
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
            let folder = responseData as IBoxFolderEntry;
            return { id: folder.id, name: folder.name, etag: folder.etag, sequence_id: folder.sequence_id, type: folder.type };
        }
        catch (error) {

            if (error.statusCode === 401) {
                throw new Error(boxApiErrorMessages.CredentialsNotFoundError);
            }

            if (error.statusCode === 409 && error.error.code === 'item_name_in_use') {
                throw new Error(boxApiErrorMessages.DuplicateFolderNameError);
            }

            if (error.statusCode === 409 && error.error.code === 'operation_blocked_temporary') {
                throw new Error(boxApiErrorMessages.OperationBlockedError);
            }

            if (error.statusCode === 404) {
                throw new Error(boxApiErrorMessages.FolderNotFoundError);
            }

            if (error.statusCode === 403) {
                throw new Error(boxApiErrorMessages.InvalidPermissionsError);
            }

            if (error.statusCode === 400 && error.error.code === 'bad_request') {
                throw new Error(boxApiErrorMessages.BadRequestError);
            }

            if (error.statusCode === 400 && error.error.code === 'item_name_too_long') {
                throw new Error(boxApiErrorMessages.FolderNameTooLongError);
            }

            if (error.statusCode === 400 && error.error.code === 'item_name_invalid') {
                throw new Error(boxApiErrorMessages.FolderNameInvalidError);
            }

            if (error.error && error.error.error_summary) {
                throw new Error(`Box error response [${error.statusCode}]: ${error.error.error_summary}`);
            }
        }
    } else {
        throw new Error(boxApiErrorMessages.FolderNameOrParentMissingError);
    }

    return responseData as IBoxFolderEntry;
}

export async function copyFolder(accessToken: string, baseFunctions: IExecuteFunctions, apiOptions: IBoxApiCopyFolderOptions): Promise<IFolderCopySuccessful> {
    let responseData = {};
    let requestMethod = 'POST';
    let isJson = true;
    let headers: IDataObject;
    headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    };
    if (apiOptions && apiOptions.parent && apiOptions.folder) {
        let endpoint = boxApiBaseUri + 'folders' + `/${apiOptions.folder}/copy`;
        let body: ICopyFolder = {
            name: apiOptions.name,
            parent: { id: apiOptions.parent }
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
            let folder = responseData as IBoxFolderEntry;
            return { success: true } as IFolderCopySuccessful;
        }
        catch (error) {

            if (error.statusCode === 401) {
                throw new Error(boxApiErrorMessages.CredentialsNotFoundError);
            }

            if (error.statusCode === 409 && error.error.code === 'item_name_in_use') {
                throw new Error(boxApiErrorMessages.DuplicateFolderNameError);
            }

            if (error.statusCode === 409 && error.error.code === 'operation_blocked_temporary') {
                throw new Error(boxApiErrorMessages.OperationBlockedError);
            }

            if (error.statusCode === 404) {
                throw new Error(boxApiErrorMessages.FolderNotFoundError);
            }

            if (error.statusCode === 403) {
                throw new Error(boxApiErrorMessages.InvalidPermissionsError);
            }

            if (error.statusCode === 400 && error.error.code === 'bad_request') {
                throw new Error(boxApiErrorMessages.BadRequestError);
            }

            if (error.statusCode === 400 && error.error.code === 'item_name_too_long') {
                throw new Error(boxApiErrorMessages.FolderNameTooLongError);
            }

            if (error.statusCode === 400 && error.error.code === 'item_name_invalid') {
                throw new Error(boxApiErrorMessages.FolderNameInvalidError);
            }

            if (error.error && error.error.error_summary) {
                throw new Error(`Box error response [${error.statusCode}]: ${error.error.error_summary}`);
            }
        }
    } else {
        throw new Error(boxApiErrorMessages.FolderIdOrParentMissingError);
    }

    return responseData as IFolderCopySuccessful;
}

export async function modifyFolder(accessToken: string, baseFunctions: IExecuteFunctions, apiOptions: IBoxApiModifyFolderOptions): Promise<IFolderModifySuccessful> {
    let responseData = {};
    let requestMethod = 'PUT';
    let isJson = true;
    let headers: IDataObject;
    headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    };
    if (apiOptions && apiOptions.folder) {
        let endpoint = boxApiBaseUri + 'folders' + `/${apiOptions.folder}`;
        let body: IModifyFolder = {
            name: apiOptions.name,
            description: apiOptions.description,
            parent: { id: apiOptions.parent },
            tags: apiOptions.tags
        }
        if (apiOptions.folderUploadEmail) {
            body.folder_upload_email = { access: apiOptions.folderUploadEmail };
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
            let folder = responseData as IBoxFolderEntry;
            return { success: true } as IFolderCopySuccessful;
        }
        catch (error) {

            if (error.statusCode === 401) {
                throw new Error(boxApiErrorMessages.CredentialsNotFoundError);
            }

            if (error.statusCode === 409 && error.error.code === 'item_name_in_use') {
                throw new Error(boxApiErrorMessages.DuplicateFolderNameError);
            }

            if (error.statusCode === 409 && error.error.code === 'operation_blocked_temporary') {
                throw new Error(boxApiErrorMessages.OperationBlockedError);
            }

            if (error.statusCode === 404) {
                throw new Error(boxApiErrorMessages.FolderNotFoundError);
            }

            if (error.statusCode === 403) {
                throw new Error(boxApiErrorMessages.InvalidPermissionsError);
            }

            if (error.statusCode === 400 && error.error.code === 'bad_request') {
                throw new Error(boxApiErrorMessages.BadRequestError);
            }

            if (error.statusCode === 400 && error.error.code === 'item_name_too_long') {
                throw new Error(boxApiErrorMessages.FolderNameTooLongError);
            }

            if (error.statusCode === 400 && error.error.code === 'item_name_invalid') {
                throw new Error(boxApiErrorMessages.FolderNameInvalidError);
            }

            if (error.error && error.error.error_summary) {
                throw new Error(`Box error response [${error.statusCode}]: ${error.error.error_summary}`);
            }
        }
    } else {
        throw new Error(boxApiErrorMessages.FolderIdOrParentMissingError);
    }

    return responseData as IFolderCopySuccessful;
}

export async function deleteFolder(accessToken: string, baseFunctions: IExecuteFunctions, apiOptions: IBoxApiDeleteFolderOptions): Promise<IFolderDeleteSuccessful> {
    let responseData = {};
    let requestMethod = 'DELETE';
    let isJson = true;
    let headers: IDataObject;
    headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    };
    if (apiOptions.folder) {
        let endpoint = boxApiBaseUri + 'folders' + `/${apiOptions.folder}?recursive=${apiOptions.recursive}`;

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
            return { success: true } as IFolderDeleteSuccessful;
        }
        catch (error) {

            if (error.statusCode === 401) {
                throw new Error(boxApiErrorMessages.CredentialsNotFoundError);
            }

            if (error.statusCode === 409 && error.error.code === 'operation_blocked_temporary') {
                throw new Error(boxApiErrorMessages.OperationBlockedError);
            }

            if (error.statusCode === 409 && error.error.code === 'folder_not_empty') {
                throw new Error(boxApiErrorMessages.FolderNotEmptyForDeleteError);
            }

            if (error.statusCode === 400 && error.error.code === 'folder_not_empty') {
                throw new Error(boxApiErrorMessages.FolderNotEmptyForDeleteError);
            }

            if (error.statusCode === 404) {
                throw new Error(boxApiErrorMessages.FolderNotFoundError);
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
        throw new Error(boxApiErrorMessages.FolderIdOrParentMissingError);
    }

    return responseData as IFolderDeleteSuccessful;
}

