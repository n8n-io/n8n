"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttachmentDownloader = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("@microsoft/agents-activity/logger");
const auth_1 = require("../auth");
const logger = (0, logger_1.debug)('agents:attachmentDownloader');
/**
 * A utility class for downloading input files from activity attachments.
 *
 * @typeParam TState - The type of the turn state used in the application.
 *
 * @remarks
 * This class provides functionality to filter and download attachments from a turn context,
 * supporting various content types and handling authentication for secure URLs.
 *
 */
class AttachmentDownloader {
    /**
     * Creates an instance of AttachmentDownloader.
     * This class is responsible for downloading input files from attachments.
     *
     * @param stateKey The key to store files in state. Defaults to 'inputFiles'.
     */
    constructor(stateKey = 'inputFiles') {
        this._httpClient = axios_1.default.create();
        this._stateKey = stateKey;
    }
    /**
     * Downloads files from the attachments in the current turn context.
     *
     * @param context The turn context containing the activity with attachments.
     * @returns A promise that resolves to an array of downloaded input files.
     */
    async downloadFiles(context) {
        var _a;
        const attachments = (_a = context.activity.attachments) === null || _a === void 0 ? void 0 : _a.filter((a) => !a.contentType.startsWith('text/html'));
        if (!attachments || attachments.length === 0) {
            logger.info('No Attachments to download');
            return Promise.resolve([]);
        }
        // TODO: from adapter
        const authProvider = new auth_1.MsalTokenProvider();
        const accessToken = await authProvider.getAccessToken((0, auth_1.loadAuthConfigFromEnv)(), 'https://api.botframework.com');
        const files = [];
        for (const attachment of attachments) {
            const file = await this.downloadFile(attachment, accessToken);
            if (file) {
                files.push(file);
            }
        }
        logger.info('Attachments downloaded');
        return files;
    }
    /**
     * Downloads files from the attachments in the current turn context and stores them in state.
     *
     * @param context The turn context containing the activity with attachments.
     * @param state The turn state to store the files in.
     * @returns A promise that resolves when the downloaded files are stored.
     */
    async downloadAndStoreFiles(context, state) {
        const files = await this.downloadFiles(context);
        state.setValue(this._stateKey, files);
    }
    async downloadFile(attachment, accessToken) {
        if ((attachment.contentUrl && attachment.contentUrl.startsWith('https://')) ||
            (attachment.contentUrl && attachment.contentUrl.startsWith('http://localhost'))) {
            let headers;
            if (accessToken.length > 0) {
                headers = {
                    Authorization: `Bearer ${accessToken}`
                };
            }
            const response = await this._httpClient.get(attachment.contentUrl, {
                headers,
                responseType: 'arraybuffer'
            });
            const content = Buffer.from(response.data, 'binary');
            let contentType = attachment.contentType;
            if (contentType === 'image/*') {
                contentType = 'image/png';
            }
            return {
                content,
                contentType,
                contentUrl: attachment.contentUrl
            };
        }
        else {
            return {
                content: Buffer.from(attachment.content),
                contentType: attachment.contentType,
                contentUrl: attachment.contentUrl
            };
        }
    }
}
exports.AttachmentDownloader = AttachmentDownloader;
//# sourceMappingURL=attachmentDownloader.js.map