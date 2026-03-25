"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TurnStateProperty = void 0;
/**
 * Maps an application's Turn State property to a State property.
 * @typeParam T Optional. Type of the property being mapped. Defaults to any.
 */
class TurnStateProperty {
    /**
       * Creates a new instance of the `TurnStateProperty` class.
       * @param {TurnState} state Current application turn state.
       * @param {string} scopeName Name of properties the memory scope to use.
       * @param {string} propertyName Name of the property to use.
       */
    constructor(state, scopeName, propertyName) {
        this._propertyName = propertyName;
        const scope = state.getScope(scopeName);
        if (!scope) {
            throw new Error(`TurnStateProperty: TurnState missing state scope named "${scope}".`);
        }
        this._state = scope;
        if (!this._state) {
            throw new Error(`TurnStateProperty: TurnState missing state scope named "${scope}".`);
        }
    }
    /**
       * Deletes the state property.
       * @returns {Promise<void>} A promise that represents the work queued to execute.
       */
    delete() {
        this._state.value[this._propertyName] = undefined;
        return Promise.resolve();
    }
    get(defaultValue) {
        if (this._state.value[this._propertyName] === undefined) {
            this._state.value[this._propertyName] = defaultValue;
        }
        return Promise.resolve(this._state.value[this._propertyName]);
    }
    /**
       * Replace's the state property value.
       * @typeParam T
       * @param {TurnContext} context The context object for the turn.
       * @param {T} value The value to assign to the state property.
       * @returns {Promise<void>} A promise that represents the work queued to execute.
       */
    set(context, value) {
        this._state.value[this._propertyName] = value;
        return Promise.resolve();
    }
}
exports.TurnStateProperty = TurnStateProperty;
//# sourceMappingURL=turnStateProperty.js.map