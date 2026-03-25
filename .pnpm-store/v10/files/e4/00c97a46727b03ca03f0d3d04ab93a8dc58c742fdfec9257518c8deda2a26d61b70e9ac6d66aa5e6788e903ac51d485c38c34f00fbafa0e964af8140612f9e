"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = void 0;
const assistant_data_1 = require("../../pinecone-generated-ts-fetch/assistant_data");
const errors_1 = require("../../errors");
const utils_1 = require("../../utils");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uploadFile = (assistantName, apiProvider, config) => {
    return async (options) => {
        const fetch = (0, utils_1.getFetch)(config);
        validateUploadFileOptions(options);
        const fileBuffer = fs_1.default.readFileSync(options.path);
        const fileName = path_1.default.basename(options.path);
        const mimeType = getMimeType(fileName);
        const fileBlob = new Blob([fileBuffer], { type: mimeType });
        const formData = new FormData();
        formData.append('file', fileBlob, fileName);
        const hostUrl = await apiProvider.provideHostUrl();
        let filesUrl = `${hostUrl}/files/${assistantName}`;
        const requestHeaders = {
            'Api-Key': config.apiKey,
            'User-Agent': (0, utils_1.buildUserAgent)(config),
            'X-Pinecone-Api-Version': assistant_data_1.X_PINECONE_API_VERSION,
        };
        if (options.metadata) {
            const encodedMetadata = encodeURIComponent(JSON.stringify(options.metadata));
            filesUrl += `?metadata=${encodedMetadata}`;
        }
        const response = await fetch(filesUrl, {
            method: 'POST',
            headers: requestHeaders,
            body: formData,
        });
        if (response.ok) {
            const assistantFileModel = new assistant_data_1.JSONApiResponse(response, (jsonValue) => (0, assistant_data_1.AssistantFileModelFromJSON)(jsonValue)).value();
            return assistantFileModel;
        }
        else {
            const err = await (0, errors_1.handleApiError)(new assistant_data_1.ResponseError(response, 'Response returned an error'), undefined, filesUrl);
            throw err;
        }
    };
};
exports.uploadFile = uploadFile;
const validateUploadFileOptions = (options) => {
    if (!options || !options.path) {
        throw new errors_1.PineconeArgumentError('You must pass an object with required properties (`path`) to upload a file.');
    }
};
// get mime types for accepted file types
function getMimeType(filePath) {
    const extensionToMimeType = {
        pdf: 'application/pdf',
        json: 'application/json',
        txt: 'text/plain',
        md: 'text/markdown',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    // Extract file extension and ensure it's lowercase
    const parts = filePath.split('.');
    if (parts.length < 2) {
        return 'application/octet-stream'; // Default for files without extensions
    }
    const ext = parts.pop();
    const extension = ext ? ext.toLowerCase() : '';
    // Return the MIME type or a default value for unsupported types
    return extensionToMimeType[extension];
}
//# sourceMappingURL=uploadFile.js.map