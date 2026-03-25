/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { ActiveAuthorizationHandler } from './types';
import { TurnContext } from '../../turnContext';
import { Storage } from '../../storage';
/**
 * Storage manager for handler state.
 */
export declare class HandlerStorage<TActiveHandler extends ActiveAuthorizationHandler = ActiveAuthorizationHandler> {
    private storage;
    private context;
    /**
     * Creates an instance of the HandlerStorage.
     * @param storage The storage provider.
     * @param context The turn context.
     */
    constructor(storage: Storage, context: TurnContext);
    /**
     * Gets the unique key for a handler session.
     */
    get key(): string;
    /**
     * Reads the active handler state from storage.
     */
    read(): Promise<TActiveHandler | undefined>;
    /**
     * Writes handler state to storage.
     */
    write(data: TActiveHandler): Promise<void>;
    /**
     * Deletes handler state from storage.
     */
    delete(): Promise<void>;
}
