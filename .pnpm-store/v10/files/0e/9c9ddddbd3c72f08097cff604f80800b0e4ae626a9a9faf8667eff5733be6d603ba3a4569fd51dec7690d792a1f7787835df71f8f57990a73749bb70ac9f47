/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { Activity, Attachment, ClientCitation, SensitivityUsageInfo } from '@microsoft/agents-activity';
import { TurnContext } from '../../turnContext';
import { Citation } from './citation';
/**
 * Results for streaming response operations.
 */
export declare enum StreamingResponseResult {
    /**
     * The operation was successful.
     */
    Success = "success",
    /**
     * The stream has already ended.
     */
    AlreadyEnded = "alreadyEnded",
    /**
     * The user canceled the streaming response.
     */
    UserCanceled = "userCanceled",
    /**
     * An error occurred during the streaming response.
     */
    Error = "error"
}
/**
 * A helper class for streaming responses to the client.
 *
 * @remarks
 * This class is used to send a series of updates to the client in a single response. The expected
 * sequence of calls is:
 *
 * `queueInformativeUpdate()`, `queueTextChunk()`, `queueTextChunk()`, ..., `endStream()`.
 *
 * Once `endStream()` is called, the stream is considered ended and no further updates can be sent.
 */
export declare class StreamingResponse {
    private readonly _context;
    private _nextSequence;
    private _streamId?;
    private _message;
    private _attachments?;
    private _ended;
    private _delayInMs;
    private _isStreamingChannel;
    private _finalMessage?;
    private _canceled;
    private _userCanceled;
    private _queue;
    private _queueSync;
    private _chunkQueued;
    private _enableFeedbackLoop;
    private _feedbackLoopType?;
    private _enableGeneratedByAILabel;
    private _citations?;
    private _sensitivityLabel?;
    /**
     * Creates a new StreamingResponse instance.
     *
     * @param {TurnContext} context - Context for the current turn of conversation with the user.
     * @returns {TurnContext} - The context for the current turn of conversation with the user.
     */
    constructor(context: TurnContext);
    /**
     * Gets the stream ID of the current response.
     *
     * @returns {string | undefined} - The stream ID of the current response.
     *
     * @remarks
     * Assigned after the initial update is sent.
     */
    get streamId(): string | undefined;
    /**
       * Gets the citations of the current response.
       */
    get citations(): ClientCitation[] | undefined;
    /**
     * Gets the number of updates sent for the stream.
     *
     * @returns {number} - The number of updates sent for the stream.
     */
    get updatesSent(): number;
    /**
     * Gets the delay in milliseconds between chunks.
     * @remarks
     * Teams default: 1000 ms
     * Web Chat / Direct Line default: 500 ms
     * Other channels: 250 ms
     */
    get delayInMs(): number;
    /**
     * Gets whether the channel supports streaming.
     */
    get isStreamingChannel(): boolean;
    /**
     * Queues an informative update to be sent to the client.
     *
     * @param {string} text Text of the update to send.
     */
    queueInformativeUpdate(text: string): void;
    /**
     * Queues a chunk of partial message text to be sent to the client
     *
     * @param {string} text Partial text of the message to send.
     * @param {Citation[]} citations Citations to be included in the message.
     *
     * @remarks
     * The text we be sent as quickly as possible to the client. Chunks may be combined before
     * delivery to the client.
     *
     */
    queueTextChunk(text: string, citations?: Citation[]): void;
    /**
     * Ends the stream by sending the final message to the client.
     *
     * @returns {Promise<StreamingResponseResult>} - StreamingResponseResult with the result of the streaming response.
     */
    endStream(): Promise<StreamingResponseResult>;
    /**
     * Resets the streaming response to its initial state.
     * If the stream is still running, this will wait for completion.
     */
    reset(): Promise<void>;
    /**
     * Set Activity that will be (optionally) used for the final streaming message.
     */
    setFinalMessage(activity: Activity): void;
    /**
     * Sets the attachments to attach to the final chunk.
     *
     * @param attachments List of attachments.
     */
    setAttachments(attachments: Attachment[]): void;
    /**
     * Sets the sensitivity label to attach to the final chunk.
     *
     * @param sensitivityLabel The sensitivty label.
     */
    setSensitivityLabel(sensitivityLabel: SensitivityUsageInfo): void;
    /**
     * Sets the citations for the full message.
     *
     * @param {Citation[]} citations Citations to be included in the message.
     */
    setCitations(citations: Citation[]): void;
    /**
     * Sets the Feedback Loop in Teams that allows a user to
     * give thumbs up or down to a response.
     * Default is `false`.
     *
     * @param enableFeedbackLoop If true, the feedback loop is enabled.
     */
    setFeedbackLoop(enableFeedbackLoop: boolean): void;
    /**
     * Sets the type of UI to use for the feedback loop.
     *
     * @param feedbackLoopType The type of the feedback loop.
     */
    setFeedbackLoopType(feedbackLoopType: 'default' | 'custom'): void;
    /**
     * Sets the the Generated by AI label in Teams
     * Default is `false`.
     *
     * @param enableGeneratedByAILabel If true, the label is added.
     */
    setGeneratedByAILabel(enableGeneratedByAILabel: boolean): void;
    /**
     * Sets the delay in milliseconds between chunks.
     * @param delayInMs The delay in milliseconds.
     */
    setDelayInMs(delayInMs: number): void;
    /**
     * Returns the most recently streamed message.
     *
     * @returns The streamed message.
     */
    getMessage(): string;
    /**
     * Waits for the outgoing activity queue to be empty.
     *
     * @returns {Promise<void>} - A promise representing the async operation.
     */
    private waitForQueue;
    /**
     * Queues the next chunk of text to be sent to the client.
     *
     * @private
     */
    private queueNextChunk;
    /**
     * Queues an activity to be sent to the client.
     */
    private queueActivity;
    /**
     * Sends any queued activities to the client until the queue is empty.
     *
     * @returns {Promise<void>} - A promise that will be resolved once the queue is empty.
     * @private
     */
    private drainQueue;
    /**
     * Creates the final message to be sent at the end of the stream.
     */
    private createFinalMessage;
    /**
     * Sends an activity to the client and saves the stream ID returned.
     *
     * @param {Activity} activity - The activity to send.
     * @returns {Promise<void>} - A promise representing the async operation.
     * @private
     */
    private sendActivity;
    /**
     * Loads default values for the streaming response.
     */
    private loadDefaults;
}
