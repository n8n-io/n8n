"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamsAttachmentDownloader = void 0;
const agents_activity_1 = require("@microsoft/agents-activity");
const logger_1 = require("@microsoft/agents-activity/logger");
const axios_1 = __importDefault(require("axios"));
const zod_1 = require("zod");
const logger = (0, logger_1.debug)('agents:teamsAttachmentDownloader');
/**
 * Downloads attachments from Teams using the bots access token.
 */
class TeamsAttachmentDownloader {
    constructor(stateKey = 'inputFiles') {
        this._httpClient = axios_1.default.create();
        this._stateKey = stateKey;
    }
    /**
     * Download any files relative to the current user's input.
     *
     * @param {TurnContext} context Context for the current turn of conversation.
     * @returns {Promise<InputFile[]>} Promise that resolves to an array of downloaded input files.
     */
    async downloadFiles(context) {
        var _a;
        if (context.activity.channelId !== agents_activity_1.Channels.Msteams && context.activity.channelId !== agents_activity_1.Channels.M365Copilot) {
            return Promise.resolve([]);
        }
        // Filter out HTML attachments
        const attachments = (_a = context.activity.attachments) === null || _a === void 0 ? void 0 : _a.filter((a) => a.contentType && !a.contentType.startsWith('text/html'));
        if (!attachments || attachments.length === 0) {
            return Promise.resolve([]);
        }
        const connectorClient = context.turnState.get(context.adapter.ConnectorClientKey);
        this._httpClient.defaults.headers = connectorClient.axiosInstance.defaults.headers;
        const files = [];
        for (const attachment of attachments) {
            const file = await this.downloadFile(attachment);
            if (file) {
                files.push(file);
            }
        }
        return files;
    }
    /**
     * @private
     * @param {Attachment} attachment - Attachment to download.
     * @returns {Promise<InputFile>} - Promise that resolves to the downloaded input file.
     */
    async downloadFile(attachment) {
        let inputFile;
        if (attachment.contentUrl && attachment.contentUrl.startsWith('https://')) {
            try {
                const contentSchema = zod_1.z.object({ downloadUrl: zod_1.z.string().url() });
                const parsed = contentSchema.safeParse(attachment.content);
                const downloadUrl = parsed.success ? parsed.data.downloadUrl : attachment.contentUrl;
                const response = await this._httpClient.get(downloadUrl, { responseType: 'arraybuffer' });
                const content = Buffer.from(response.data, 'binary');
                const contentType = response.headers['content-type'] || 'application/octet-stream';
                inputFile = { content, contentType, contentUrl: attachment.contentUrl };
            }
            catch (error) {
                logger.error(`Failed to download Teams attachment: ${error}`);
                return undefined;
            }
        }
        else {
            if (!attachment.content) {
                logger.error('Attachment missing content');
                return undefined;
            }
            if (!(attachment.content instanceof ArrayBuffer) && !Buffer.isBuffer(attachment.content)) {
                logger.error('Attachment content is not ArrayBuffer or Buffer');
                return undefined;
            }
            inputFile = {
                content: Buffer.from(attachment.content),
                contentType: attachment.contentType,
                contentUrl: attachment.contentUrl
            };
        }
        return inputFile;
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
}
exports.TeamsAttachmentDownloader = TeamsAttachmentDownloader;
//# sourceMappingURL=teamsAttachmentDownloader.js.map