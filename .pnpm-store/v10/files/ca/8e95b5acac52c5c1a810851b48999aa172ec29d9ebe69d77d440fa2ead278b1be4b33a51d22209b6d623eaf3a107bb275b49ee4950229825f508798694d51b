/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { TurnContext } from '../turnContext';
import { StatePropertyAccessor } from '../state';
import { TurnState } from './turnState';
/**
 * Maps an application's Turn State property to a State property.
 * @typeParam T Optional. Type of the property being mapped. Defaults to any.
 */
export declare class TurnStateProperty<T = any> implements StatePropertyAccessor<T> {
    private readonly _state;
    private readonly _propertyName;
    /**
       * Creates a new instance of the `TurnStateProperty` class.
       * @param {TurnState} state Current application turn state.
       * @param {string} scopeName Name of properties the memory scope to use.
       * @param {string} propertyName Name of the property to use.
       */
    constructor(state: TurnState, scopeName: string, propertyName: string);
    /**
       * Deletes the state property.
       * @returns {Promise<void>} A promise that represents the work queued to execute.
       */
    delete(): Promise<void>;
    /**
       * Returns the state property value.
       */
    get(context: TurnContext): Promise<T | undefined>;
    get(context: TurnContext, defaultValue: T): Promise<T>;
    /**
       * Replace's the state property value.
       * @typeParam T
       * @param {TurnContext} context The context object for the turn.
       * @param {T} value The value to assign to the state property.
       * @returns {Promise<void>} A promise that represents the work queued to execute.
       */
    set(context: TurnContext, value: T): Promise<void>;
}
