/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
import { z } from 'zod';
import { ChannelAccount } from './channelAccount';
import { ConversationAccount } from './conversationAccount';
/**
 * Represents a reference to a conversation.
 */
export interface ConversationReference {
    /**
     * The ID of the activity. Optional.
     */
    activityId?: string;
    /**
     * The user involved in the conversation. Optional.
     */
    user?: ChannelAccount;
    /**
     * The locale of the conversation. Optional.
     */
    locale?: string;
    /**
     * The agent involved in the conversation. Can be undefined or null. Optional.
     */
    agent?: ChannelAccount | undefined | null;
    /**
     * The conversation account details.
     */
    conversation: ConversationAccount;
    /**
     * The ID of the channel where the conversation is taking place.
     */
    channelId: string;
    /**
     * The service URL for the conversation. Optional.
     */
    serviceUrl?: string | undefined;
}
/**
 * Zod schema for validating a conversation reference.
 */
export declare const conversationReferenceZodSchema: z.ZodObject<{
    activityId: z.ZodOptional<z.ZodString>;
    user: z.ZodOptional<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        aadObjectId: z.ZodOptional<z.ZodString>;
        tenantId: z.ZodOptional<z.ZodString>;
        agenticUserId: z.ZodOptional<z.ZodString>;
        agenticAppId: z.ZodOptional<z.ZodString>;
        agenticAppBlueprintId: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodUnion<[z.ZodEnum<["user", "bot", "skill", "agenticAppInstance", "agenticUser"]>, z.ZodString]>>;
        properties: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        id?: string | undefined;
        name?: string | undefined;
        tenantId?: string | undefined;
        aadObjectId?: string | undefined;
        agenticUserId?: string | undefined;
        agenticAppId?: string | undefined;
        agenticAppBlueprintId?: string | undefined;
        role?: string | undefined;
        properties?: unknown;
    }, {
        id?: string | undefined;
        name?: string | undefined;
        tenantId?: string | undefined;
        aadObjectId?: string | undefined;
        agenticUserId?: string | undefined;
        agenticAppId?: string | undefined;
        agenticAppBlueprintId?: string | undefined;
        role?: string | undefined;
        properties?: unknown;
    }>>;
    locale: z.ZodOptional<z.ZodString>;
    agent: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        aadObjectId: z.ZodOptional<z.ZodString>;
        tenantId: z.ZodOptional<z.ZodString>;
        agenticUserId: z.ZodOptional<z.ZodString>;
        agenticAppId: z.ZodOptional<z.ZodString>;
        agenticAppBlueprintId: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodUnion<[z.ZodEnum<["user", "bot", "skill", "agenticAppInstance", "agenticUser"]>, z.ZodString]>>;
        properties: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        id?: string | undefined;
        name?: string | undefined;
        tenantId?: string | undefined;
        aadObjectId?: string | undefined;
        agenticUserId?: string | undefined;
        agenticAppId?: string | undefined;
        agenticAppBlueprintId?: string | undefined;
        role?: string | undefined;
        properties?: unknown;
    }, {
        id?: string | undefined;
        name?: string | undefined;
        tenantId?: string | undefined;
        aadObjectId?: string | undefined;
        agenticUserId?: string | undefined;
        agenticAppId?: string | undefined;
        agenticAppBlueprintId?: string | undefined;
        role?: string | undefined;
        properties?: unknown;
    }>>>;
    conversation: z.ZodObject<{
        isGroup: z.ZodOptional<z.ZodBoolean>;
        conversationType: z.ZodOptional<z.ZodString>;
        tenantId: z.ZodOptional<z.ZodString>;
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        aadObjectId: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodUnion<[z.ZodEnum<["user", "bot", "skill", "agenticAppInstance", "agenticUser"]>, z.ZodString]>>;
        properties: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name?: string | undefined;
        tenantId?: string | undefined;
        aadObjectId?: string | undefined;
        role?: string | undefined;
        properties?: unknown;
        isGroup?: boolean | undefined;
        conversationType?: string | undefined;
    }, {
        id: string;
        name?: string | undefined;
        tenantId?: string | undefined;
        aadObjectId?: string | undefined;
        role?: string | undefined;
        properties?: unknown;
        isGroup?: boolean | undefined;
        conversationType?: string | undefined;
    }>;
    channelId: z.ZodString;
    serviceUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    conversation: {
        id: string;
        name?: string | undefined;
        tenantId?: string | undefined;
        aadObjectId?: string | undefined;
        role?: string | undefined;
        properties?: unknown;
        isGroup?: boolean | undefined;
        conversationType?: string | undefined;
    };
    channelId: string;
    user?: {
        id?: string | undefined;
        name?: string | undefined;
        tenantId?: string | undefined;
        aadObjectId?: string | undefined;
        agenticUserId?: string | undefined;
        agenticAppId?: string | undefined;
        agenticAppBlueprintId?: string | undefined;
        role?: string | undefined;
        properties?: unknown;
    } | undefined;
    activityId?: string | undefined;
    locale?: string | undefined;
    agent?: {
        id?: string | undefined;
        name?: string | undefined;
        tenantId?: string | undefined;
        aadObjectId?: string | undefined;
        agenticUserId?: string | undefined;
        agenticAppId?: string | undefined;
        agenticAppBlueprintId?: string | undefined;
        role?: string | undefined;
        properties?: unknown;
    } | null | undefined;
    serviceUrl?: string | undefined;
}, {
    conversation: {
        id: string;
        name?: string | undefined;
        tenantId?: string | undefined;
        aadObjectId?: string | undefined;
        role?: string | undefined;
        properties?: unknown;
        isGroup?: boolean | undefined;
        conversationType?: string | undefined;
    };
    channelId: string;
    user?: {
        id?: string | undefined;
        name?: string | undefined;
        tenantId?: string | undefined;
        aadObjectId?: string | undefined;
        agenticUserId?: string | undefined;
        agenticAppId?: string | undefined;
        agenticAppBlueprintId?: string | undefined;
        role?: string | undefined;
        properties?: unknown;
    } | undefined;
    activityId?: string | undefined;
    locale?: string | undefined;
    agent?: {
        id?: string | undefined;
        name?: string | undefined;
        tenantId?: string | undefined;
        aadObjectId?: string | undefined;
        agenticUserId?: string | undefined;
        agenticAppId?: string | undefined;
        agenticAppBlueprintId?: string | undefined;
        role?: string | undefined;
        properties?: unknown;
    } | null | undefined;
    serviceUrl?: string | undefined;
}>;
