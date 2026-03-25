"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileTranscriptLogger = void 0;
const logger_1 = require("@microsoft/agents-activity/logger");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const os_1 = require("os");
const agents_activity_1 = require("@microsoft/agents-activity");
const logger = (0, logger_1.debug)('agents:file-transcript-logger');
/**
 * FileTranscriptLogger which creates a .transcript file for each conversationId.
 * @remarks
 * This is a useful class for unit tests.
 *
 * Concurrency Safety:
 * - Uses an in-memory promise chain to serialize writes within the same Node.js process
 * - Prevents race conditions and file corruption when multiple concurrent writes occur
 * - Optimized for performance with minimal overhead (no file-based locking)
 *
 * Note: This implementation is designed for single-process scenarios. For multi-server
 * deployments, consider using a database-backed transcript store.
 */
class FileTranscriptLogger {
    /**
     * Initializes a new instance of the FileTranscriptLogger class.
     * @param folder - Folder to place the transcript files (Default current directory).
     */
    constructor(folder) {
        this._fileLocks = new Map();
        this._folder = path.normalize(folder !== null && folder !== void 0 ? folder : process.cwd());
    }
    /**
     * Log an activity to the transcript.
     * @param activity - The activity to transcribe.
     * @returns A promise that represents the work queued to execute.
     */
    async logActivity(activity) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        if (!activity) {
            throw new Error('activity is required.');
        }
        const transcriptFile = this.getTranscriptFile(activity.channelId, (_a = activity.conversation) === null || _a === void 0 ? void 0 : _a.id);
        if (activity.type === agents_activity_1.ActivityTypes.Message) {
            const sender = (_e = (_c = (_b = activity.from) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : (_d = activity.from) === null || _d === void 0 ? void 0 : _d.id) !== null && _e !== void 0 ? _e : (_f = activity.from) === null || _f === void 0 ? void 0 : _f.role;
            logger.debug(`${sender} [${activity.type}] ${activity.text}`);
        }
        else {
            const sender = (_k = (_h = (_g = activity.from) === null || _g === void 0 ? void 0 : _g.name) !== null && _h !== void 0 ? _h : (_j = activity.from) === null || _j === void 0 ? void 0 : _j.id) !== null && _k !== void 0 ? _k : (_l = activity.from) === null || _l === void 0 ? void 0 : _l.role;
            logger.debug(`${sender} [${activity.type}]`);
        }
        await this.withFileLock(transcriptFile, async () => {
            const maxRetries = 3;
            for (let i = 1; i <= maxRetries; i++) {
                try {
                    switch (activity.type) {
                        case agents_activity_1.ActivityTypes.MessageDelete:
                            return await this.messageDeleteAsync(activity, transcriptFile);
                        case agents_activity_1.ActivityTypes.MessageUpdate:
                            return await this.messageUpdateAsync(activity, transcriptFile);
                        default: // Append activity
                            return await this.logActivityToFile(activity, transcriptFile);
                    }
                }
                catch (error) {
                    // Try again
                    logger.warn(`Try ${i} - Failed to log activity because:`, error);
                    if (i === maxRetries) {
                        throw error;
                    }
                }
            }
        });
    }
    /**
     * Gets from the store activities that match a set of criteria.
     * @param channelId - The ID of the channel the conversation is in.
     * @param conversationId - The ID of the conversation.
     * @param continuationToken - The continuation token (if available).
     * @param startDate - A cutoff date. Activities older than this date are not included.
     * @returns A promise that resolves with the matching activities.
     */
    async getTranscriptActivities(channelId, conversationId, continuationToken, startDate) {
        const transcriptFile = this.getTranscriptFile(channelId, conversationId);
        if (!await this.pathExists(transcriptFile)) {
            logger.debug(`Transcript file does not exist: ${this.protocol(transcriptFile)}`);
            return { items: [], continuationToken: undefined };
        }
        const transcript = await this.loadTranscriptAsync(transcriptFile);
        const filterDate = startDate !== null && startDate !== void 0 ? startDate : new Date(0);
        const items = transcript.filter(activity => {
            const activityDate = activity.timestamp ? new Date(activity.timestamp) : new Date(0);
            return activityDate >= filterDate;
        });
        return { items, continuationToken: undefined };
    }
    /**
     * Gets the conversations on a channel from the store.
     * @param channelId - The ID of the channel.
     * @param continuationToken - Continuation token (if available).
     * @returns A promise that resolves with all transcripts for the given ChannelID.
     */
    async listTranscripts(channelId, continuationToken) {
        const channelFolder = this.getChannelFolder(channelId);
        if (!await this.pathExists(channelFolder)) {
            logger.debug(`Channel folder does not exist: ${this.protocol(channelFolder)}`);
            return { items: [], continuationToken: undefined };
        }
        const files = await fs.readdir(channelFolder);
        const items = [];
        for (const file of files) {
            if (!file.endsWith('.transcript')) {
                continue;
            }
            const filePath = path.join(channelFolder, file);
            const stats = await fs.stat(filePath);
            items.push({
                channelId,
                id: path.parse(file).name,
                created: stats.birthtime
            });
        }
        return { items, continuationToken: undefined };
    }
    /**
     * Deletes conversation data from the store.
     * @param channelId - The ID of the channel the conversation is in.
     * @param conversationId - The ID of the conversation to delete.
     * @returns A promise that represents the work queued to execute.
     */
    async deleteTranscript(channelId, conversationId) {
        const file = this.getTranscriptFile(channelId, conversationId);
        await this.withFileLock(file, async () => {
            if (!await this.pathExists(file)) {
                logger.debug(`Transcript file does not exist: ${this.protocol(file)}`);
                return;
            }
            await fs.unlink(file);
        });
    }
    /**
     * Loads a transcript from a file.
     */
    async loadTranscriptAsync(transcriptFile) {
        if (!await this.pathExists(transcriptFile)) {
            return [];
        }
        const json = await fs.readFile(transcriptFile, 'utf-8');
        const result = JSON.parse(json);
        return result.map(agents_activity_1.Activity.fromObject);
    }
    /**
     * Executes a file operation with exclusive locking per file.
     * This ensures that concurrent writes to the same transcript file are serialized.
     */
    async withFileLock(transcriptFile, operation) {
        var _a;
        // Get the current lock chain for this file
        const existingLock = (_a = this._fileLocks.get(transcriptFile)) !== null && _a !== void 0 ? _a : Promise.resolve();
        // Create a new lock that waits for the existing one and then performs the operation
        const newLock = existingLock.then(async () => {
            return await operation();
        }).catch(error => {
            logger.warn('Error in write chain:', error);
            throw error;
        });
        // Update the lock chain
        this._fileLocks.set(transcriptFile, newLock);
        // Wait for this operation to complete
        try {
            return await newLock;
        }
        finally {
            // Clean up if this was the last operation in the chain
            if (this._fileLocks.get(transcriptFile) === newLock) {
                this._fileLocks.delete(transcriptFile);
            }
        }
    }
    /**
     * Performs the actual write operation to the transcript file.
     */
    async logActivityToFile(activity, transcriptFile) {
        const activityStr = JSON.stringify(activity);
        if (!await this.pathExists(transcriptFile)) {
            const folder = path.dirname(transcriptFile);
            if (!await this.pathExists(folder)) {
                await fs.mkdir(folder, { recursive: true });
            }
            await fs.writeFile(transcriptFile, `[${activityStr}]`, 'utf-8');
            return;
        }
        // Use file handle to append efficiently
        const fileHandle = await fs.open(transcriptFile, 'r+');
        try {
            const stats = await fileHandle.stat();
            // Seek to before the closing bracket
            const position = Math.max(0, stats.size - 1);
            // Write the comma, new activity, and closing bracket
            const appendContent = `,${os_1.EOL}${activityStr}]`;
            await fileHandle.write(appendContent, position);
            // Truncate any remaining content (in case the file had trailing data)
            await fileHandle.truncate(position + Buffer.byteLength(appendContent));
        }
        finally {
            await fileHandle.close();
        }
    }
    /**
     * Updates a message in the transcript.
     */
    async messageUpdateAsync(activity, transcriptFile) {
        // Load all activities
        const transcript = await this.loadTranscriptAsync(transcriptFile);
        for (let i = 0; i < transcript.length; i++) {
            const originalActivity = transcript[i];
            if (originalActivity.id === activity.id) {
                // Clone and update the activity
                const updatedActivity = { ...activity };
                updatedActivity.type = originalActivity.type; // Fixup original type (should be Message)
                updatedActivity.localTimestamp = originalActivity.localTimestamp;
                updatedActivity.timestamp = originalActivity.timestamp;
                transcript[i] = updatedActivity;
                const json = JSON.stringify(transcript);
                await fs.writeFile(transcriptFile, json, 'utf-8');
                return;
            }
        }
    }
    /**
     * Deletes a message from the transcript (tombstones it).
     */
    async messageDeleteAsync(activity, transcriptFile) {
        var _a, _b;
        // Load all activities
        const transcript = await this.loadTranscriptAsync(transcriptFile);
        // If message delete comes in, tombstone the message in the transcript
        for (let index = 0; index < transcript.length; index++) {
            const originalActivity = transcript[index];
            if (originalActivity.id === activity.id) {
                // Tombstone the original message
                transcript[index] = {
                    type: agents_activity_1.ActivityTypes.MessageDelete,
                    id: originalActivity.id,
                    from: {
                        id: 'deleted',
                        role: (_a = originalActivity.from) === null || _a === void 0 ? void 0 : _a.role
                    },
                    recipient: {
                        id: 'deleted',
                        role: (_b = originalActivity.recipient) === null || _b === void 0 ? void 0 : _b.role
                    },
                    locale: originalActivity.locale,
                    localTimestamp: originalActivity.timestamp,
                    timestamp: originalActivity.timestamp,
                    channelId: originalActivity.channelId,
                    conversation: originalActivity.conversation,
                    serviceUrl: originalActivity.serviceUrl,
                    replyToId: originalActivity.replyToId
                };
                const json = JSON.stringify(transcript);
                await fs.writeFile(transcriptFile, json, 'utf-8');
                return;
            }
        }
    }
    /**
     * Sanitizes a string by removing invalid characters.
     */
    static sanitizeString(str, invalidChars) {
        if (!(str === null || str === void 0 ? void 0 : str.trim())) {
            return str;
        }
        // Preemptively check for : in string and replace with _
        let result = str.replaceAll(':', '_');
        // Remove invalid characters
        for (const invalidChar of invalidChars) {
            result = result.replaceAll(invalidChar, '');
        }
        return result;
    }
    /**
     * Gets the transcript file path for a conversation.
     */
    getTranscriptFile(channelId, conversationId) {
        if (!(channelId === null || channelId === void 0 ? void 0 : channelId.trim())) {
            throw new Error('channelId is required.');
        }
        if (!(conversationId === null || conversationId === void 0 ? void 0 : conversationId.trim())) {
            throw new Error('conversationId is required.');
        }
        // Get invalid filename characters (cross-platform)
        const invalidChars = this.getInvalidFileNameChars();
        let fileName = FileTranscriptLogger.sanitizeString(conversationId, invalidChars);
        const maxLength = FileTranscriptLogger.MAX_FILE_NAME_SIZE - FileTranscriptLogger.TRANSCRIPT_FILE_EXTENSION.length;
        if (fileName && fileName.length > maxLength) {
            fileName = fileName.substring(0, maxLength);
        }
        const channelFolder = this.getChannelFolder(channelId);
        return path.join(channelFolder, fileName + FileTranscriptLogger.TRANSCRIPT_FILE_EXTENSION);
    }
    /**
     * Gets the channel folder path, creating it if necessary.
     */
    getChannelFolder(channelId) {
        if (!(channelId === null || channelId === void 0 ? void 0 : channelId.trim())) {
            throw new Error('channelId is required.');
        }
        const invalidChars = this.getInvalidPathChars();
        const folderName = FileTranscriptLogger.sanitizeString(channelId, invalidChars);
        return path.join(this._folder, folderName);
    }
    /**
     * Checks if a file or directory exists.
     */
    async pathExists(path) {
        try {
            await fs.stat(path);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Gets invalid filename characters for the current platform.
     */
    getInvalidFileNameChars() {
        // Windows invalid filename chars: < > : " / \ | ? *
        // Unix systems are more permissive, but / is always invalid
        const invalid = this.getInvalidPathChars();
        if (process.platform === 'win32') {
            return [...invalid, '/', '\\'];
        }
        else {
            return [...invalid, '/'];
        }
    }
    /**
     * Gets invalid path characters for the current platform.
     */
    getInvalidPathChars() {
        // Similar to filename chars but allows directory separators in the middle
        if (process.platform === 'win32') {
            return ['<', '>', ':', '"', '|', '?', '*', '\0'];
        }
        else {
            // Unix/Linux: only null byte is invalid in paths
            return ['\0'];
        }
    }
    /**
     * Adds file:// protocol to a file path.
     */
    protocol(filePath) {
        return `file://${filePath.replace(/\\/g, '/')}`;
    }
}
exports.FileTranscriptLogger = FileTranscriptLogger;
FileTranscriptLogger.TRANSCRIPT_FILE_EXTENSION = '.transcript';
FileTranscriptLogger.MAX_FILE_NAME_SIZE = 100;
//# sourceMappingURL=fileTranscriptLogger.js.map