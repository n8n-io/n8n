/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { InputFile, InputFileDownloader } from './inputFileDownloader';
import { TurnState } from './turnState';
import { TurnContext } from '../turnContext';
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
export declare class AttachmentDownloader<TState extends TurnState = TurnState> implements InputFileDownloader<TState> {
    private _httpClient;
    private _stateKey;
    /**
     * Creates an instance of AttachmentDownloader.
     * This class is responsible for downloading input files from attachments.
     *
     * @param stateKey The key to store files in state. Defaults to 'inputFiles'.
     */
    constructor(stateKey?: string);
    /**
     * Downloads files from the attachments in the current turn context.
     *
     * @param context The turn context containing the activity with attachments.
     * @returns A promise that resolves to an array of downloaded input files.
     */
    downloadFiles(context: TurnContext): Promise<InputFile[]>;
    /**
     * Downloads files from the attachments in the current turn context and stores them in state.
     *
     * @param context The turn context containing the activity with attachments.
     * @param state The turn state to store the files in.
     * @returns A promise that resolves when the downloaded files are stored.
     */
    downloadAndStoreFiles(context: TurnContext, state: TState): Promise<void>;
    private downloadFile;
}
