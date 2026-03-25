"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserState = void 0;
const agentState_1 = require("./agentState");
/**
 * Manages the state of a user.
 */
class UserState extends agentState_1.AgentState {
    /**
      * Creates a new instance of UserState.
      * @param storage The storage provider.
      */
    constructor(storage, namespace = '') {
        super(storage, (context) => {
            const key = this.getStorageKey(context);
            return key !== null && key !== void 0 ? key : new Error('UserState: overridden getStorageKey method did not return a key.');
        });
        this.namespace = namespace;
    }
    getStorageKey(context) {
        const activity = context.activity;
        const channelId = activity.channelId;
        const userId = activity && (activity.from != null) && activity.from.id ? activity.from.id : undefined;
        if (!channelId) {
            throw new Error('missing activity.channelId');
        }
        if (!userId) {
            throw new Error('missing activity.from.id');
        }
        return `${channelId}/users/${userId}/${this.namespace}`;
    }
}
exports.UserState = UserState;
//# sourceMappingURL=userState.js.map