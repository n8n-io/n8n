/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { PagedResult, TranscriptInfo } from './transcriptLogger';
import { TranscriptStore } from './transcriptStore';
import { Activity } from '@microsoft/agents-activity';
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
export declare class FileTranscriptLogger implements TranscriptStore {
    private static readonly TRANSCRIPT_FILE_EXTENSION;
    private static readonly MAX_FILE_NAME_SIZE;
    private readonly _folder;
    private readonly _fileLocks;
    /**
     * Initializes a new instance of the FileTranscriptLogger class.
     * @param folder - Folder to place the transcript files (Default current directory).
     */
    constructor(folder?: string);
    /**
     * Log an activity to the transcript.
     * @param activity - The activity to transcribe.
     * @returns A promise that represents the work queued to execute.
     */
    logActivity(activity: Activity): Promise<void>;
    /**
     * Gets from the store activities that match a set of criteria.
     * @param channelId - The ID of the channel the conversation is in.
     * @param conversationId - The ID of the conversation.
     * @param continuationToken - The continuation token (if available).
     * @param startDate - A cutoff date. Activities older than this date are not included.
     * @returns A promise that resolves with the matching activities.
     */
    getTranscriptActivities(channelId: string, conversationId: string, continuationToken?: string, startDate?: Date): Promise<PagedResult<Activity>>;
    /**
     * Gets the conversations on a channel from the store.
     * @param channelId - The ID of the channel.
     * @param continuationToken - Continuation token (if available).
     * @returns A promise that resolves with all transcripts for the given ChannelID.
     */
    listTranscripts(channelId: string, continuationToken?: string): Promise<PagedResult<TranscriptInfo>>;
    /**
     * Deletes conversation data from the store.
     * @param channelId - The ID of the channel the conversation is in.
     * @param conversationId - The ID of the conversation to delete.
     * @returns A promise that represents the work queued to execute.
     */
    deleteTranscript(channelId: string, conversationId: string): Promise<void>;
    /**
     * Loads a transcript from a file.
     */
    private loadTranscriptAsync;
    /**
     * Executes a file operation with exclusive locking per file.
     * This ensures that concurrent writes to the same transcript file are serialized.
     */
    private withFileLock;
    /**
     * Performs the actual write operation to the transcript file.
     */
    private logActivityToFile;
    /**
     * Updates a message in the transcript.
     */
    private messageUpdateAsync;
    /**
     * Deletes a message from the transcript (tombstones it).
     */
    private messageDeleteAsync;
    /**
     * Sanitizes a string by removing invalid characters.
     */
    private static sanitizeString;
    /**
     * Gets the transcript file path for a conversation.
     */
    private getTranscriptFile;
    /**
     * Gets the channel folder path, creating it if necessary.
     */
    private getChannelFolder;
    /**
     * Checks if a file or directory exists.
     */
    private pathExists;
    /**
     * Gets invalid filename characters for the current platform.
     */
    private getInvalidFileNameChars;
    /**
     * Gets invalid path characters for the current platform.
     */
    private getInvalidPathChars;
    /**
     * Adds file:// protocol to a file path.
     */
    private protocol;
}
