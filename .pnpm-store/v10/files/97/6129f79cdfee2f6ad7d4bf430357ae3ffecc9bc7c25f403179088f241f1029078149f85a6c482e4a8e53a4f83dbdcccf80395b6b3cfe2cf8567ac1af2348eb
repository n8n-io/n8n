"use strict";
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationState = void 0;
const agentState_1 = require("./agentState");
/**
 * Manages the state of a conversation.
 */
class ConversationState extends agentState_1.AgentState {
    /**
     * Creates a new instance of ConversationState.
     * @param storage The storage provider.
     */
    constructor(storage, namespace = '') {
        super(storage, (context) => {
            const key = this.getStorageKey(context);
            return key !== null && key !== void 0 ? key : new Error('ConversationState: overridden getStorageKey method did not return a key.');
        });
        this.namespace = namespace;
    }
    getStorageKey(context) {
        const activity = context.activity;
        const channelId = activity.channelId;
        const conversationId = activity && (activity.conversation != null) && activity.conversation.id ? activity.conversation.id : undefined;
        if (!channelId) {
            throw new Error('missing activity.channelId');
        }
        if (!conversationId) {
            throw new Error('missing activity.conversation.id');
        }
        return `${channelId}/conversations/${conversationId}/${this.namespace}`;
    }
}
exports.ConversationState = ConversationState;
//# sourceMappingURL=conversationState.js.map