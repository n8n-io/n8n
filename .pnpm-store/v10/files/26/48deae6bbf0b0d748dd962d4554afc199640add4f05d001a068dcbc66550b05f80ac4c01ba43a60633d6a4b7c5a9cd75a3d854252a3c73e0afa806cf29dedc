/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
import { Activity, ChannelAccount } from '../';
/**
 * Represents the parameters for creating a conversation.
 */
export interface ConversationParameters {
    /**
     * Indicates whether the conversation is a group conversation.
     */
    isGroup: boolean;
    /**
     * The bot account initiating the conversation.
     */
    agent?: ChannelAccount;
    /**
     * The members to include in the conversation.
     */
    members?: ChannelAccount[];
    /**
     * The topic name of the conversation.
     */
    topicName?: string;
    /**
     * The tenant ID of the conversation.
     */
    tenantId?: string;
    /**
     * The initial activity to send to the conversation.
     */
    activity: Activity;
    /**
     * Channel-specific data for the conversation.
     */
    channelData: unknown;
}
