/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { InputFile, InputFileDownloader } from './inputFileDownloader';
import { TurnContext } from '../turnContext';
import { TurnState } from './turnState';
/**
 * Downloads attachments from Teams using the bots access token.
 */
export declare class TeamsAttachmentDownloader<TState extends TurnState = TurnState> implements InputFileDownloader<TState> {
    private _httpClient;
    private _stateKey;
    constructor(stateKey?: string);
    /**
     * Download any files relative to the current user's input.
     *
     * @param {TurnContext} context Context for the current turn of conversation.
     * @returns {Promise<InputFile[]>} Promise that resolves to an array of downloaded input files.
     */
    downloadFiles(context: TurnContext): Promise<InputFile[]>;
    /**
     * @private
     * @param {Attachment} attachment - Attachment to download.
     * @returns {Promise<InputFile>} - Promise that resolves to the downloaded input file.
     */
    private downloadFile;
    /**
     * Downloads files from the attachments in the current turn context and stores them in state.
     *
     * @param context The turn context containing the activity with attachments.
     * @param state The turn state to store the files in.
     * @returns A promise that resolves when the downloaded files are stored.
     */
    downloadAndStoreFiles(context: TurnContext, state: TState): Promise<void>;
}
