/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { TurnContext } from '../turnContext'
import { TurnState } from './turnState'

/**
 * Represents a file input with its content, type, and optional URL.
 */
export interface InputFile {
  /**
   * The content of the file as a Buffer.
   */
  content: Buffer;

  /**
   * The MIME type of the file content.
   */
  contentType: string;

  /**
   * An optional URL pointing to the file content.
   */
  contentUrl?: string;
}

/**
 * Interface for downloading input files in a specific turn context and state.
 */
export interface InputFileDownloader<TState extends TurnState = TurnState> {
  /**
   * Downloads files based on the provided turn context.
   *
   * @param context - The turn context for the current operation.
   * @returns A promise that resolves to an array of input files.
   */
  downloadFiles(context: TurnContext): Promise<InputFile[]>;

  /**
   * Downloads files based on the provided turn context and store them in the provided state.
   *
   * @param context - The turn context for the current operation.
   * @param state - The state associated with the current turn.
   * @returns A promise that resolves once the files have been saved into state (void).
   */
  downloadAndStoreFiles(context: TurnContext, state: TState): Promise<void>;
}
