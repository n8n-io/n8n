/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { z } from 'zod';
import { SemanticAction } from './action/semanticAction';
import { SuggestedActions } from './action/suggestedActions';
import { ActivityEventNames } from './activityEventNames';
import { ActivityImportance } from './activityImportance';
import { ActivityTypes } from './activityTypes';
import { Attachment } from './attachment/attachment';
import { AttachmentLayoutTypes } from './attachment/attachmentLayoutTypes';
import { ChannelAccount } from './conversation/channelAccount';
import { ConversationAccount } from './conversation/conversationAccount';
import { ConversationReference } from './conversation/conversationReference';
import { EndOfConversationCodes } from './conversation/endOfConversationCodes';
import { DeliveryModes } from './deliveryModes';
import { Entity } from './entity/entity';
import { Mention } from './entity/mention';
import { InputHints } from './inputHints';
import { MessageReaction } from './messageReaction';
import { TextFormatTypes } from './textFormatTypes';
import { TextHighlight } from './textHighlight';
/**
 * Zod schema for validating an Activity object.
 */
export declare const activityZodSchema: z.ZodObject<{
    type: z.ZodUnion<[z.ZodEnum<["message", "contactRelationUpdate", "conversationUpdate", "typing", "endOfConversation", "event", "invoke", "invokeResponse", "deleteUserData", "messageUpdate", "messageDelete", "installationUpdate", "messageReaction", "suggestion", "trace", "handoff", "command", "commandResult"]>, z.ZodString]>;
    text: z.ZodOptional<z.ZodString>;
    id: z.ZodOptional<z.ZodString>;
    channelId: z.ZodOptional<z.ZodString>;
    from: z.ZodOptional<z.ZodObject<{
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
    timestamp: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodEffects<z.ZodString, Date, string>]>>;
    localTimestamp: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodEffects<z.ZodString, Date, string>]>>;
    localTimezone: z.ZodOptional<z.ZodString>;
    callerId: z.ZodOptional<z.ZodString>;
    serviceUrl: z.ZodOptional<z.ZodString>;
    conversation: z.ZodOptional<z.ZodObject<{
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
    }>>;
    recipient: z.ZodOptional<z.ZodObject<{
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
    textFormat: z.ZodOptional<z.ZodUnion<[z.ZodEnum<["markdown", "plain", "xml"]>, z.ZodString]>>;
    attachmentLayout: z.ZodOptional<z.ZodUnion<[z.ZodEnum<["list", "carousel"]>, z.ZodString]>>;
    membersAdded: z.ZodOptional<z.ZodArray<z.ZodObject<{
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
    }>, "many">>;
    membersRemoved: z.ZodOptional<z.ZodArray<z.ZodObject<{
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
    }>, "many">>;
    reactionsAdded: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodUnion<[z.ZodEnum<["like", "plusOne"]>, z.ZodString]>;
    }, "strip", z.ZodTypeAny, {
        type: string;
    }, {
        type: string;
    }>, "many">>;
    reactionsRemoved: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodUnion<[z.ZodEnum<["like", "plusOne"]>, z.ZodString]>;
    }, "strip", z.ZodTypeAny, {
        type: string;
    }, {
        type: string;
    }>, "many">>;
    topicName: z.ZodOptional<z.ZodString>;
    historyDisclosed: z.ZodOptional<z.ZodBoolean>;
    locale: z.ZodOptional<z.ZodString>;
    speak: z.ZodOptional<z.ZodString>;
    inputHint: z.ZodOptional<z.ZodUnion<[z.ZodEnum<["acceptingInput", "ignoringInput", "expectingInput"]>, z.ZodString]>>;
    summary: z.ZodOptional<z.ZodString>;
    suggestedActions: z.ZodOptional<z.ZodObject<{
        to: z.ZodArray<z.ZodString, "many">;
        actions: z.ZodArray<z.ZodObject<{
            type: z.ZodUnion<[z.ZodEnum<["openUrl", "imBack", "postBack", "playAudio", "showImage", "downloadFile", "signin", "call", "messageBack", "openApp"]>, z.ZodString]>;
            title: z.ZodString;
            image: z.ZodOptional<z.ZodString>;
            text: z.ZodOptional<z.ZodString>;
            displayText: z.ZodOptional<z.ZodString>;
            value: z.ZodOptional<z.ZodAny>;
            channelData: z.ZodOptional<z.ZodUnknown>;
            imageAltText: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: string;
            title: string;
            value?: any;
            image?: string | undefined;
            text?: string | undefined;
            displayText?: string | undefined;
            channelData?: unknown;
            imageAltText?: string | undefined;
        }, {
            type: string;
            title: string;
            value?: any;
            image?: string | undefined;
            text?: string | undefined;
            displayText?: string | undefined;
            channelData?: unknown;
            imageAltText?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        to: string[];
        actions: {
            type: string;
            title: string;
            value?: any;
            image?: string | undefined;
            text?: string | undefined;
            displayText?: string | undefined;
            channelData?: unknown;
            imageAltText?: string | undefined;
        }[];
    }, {
        to: string[];
        actions: {
            type: string;
            title: string;
            value?: any;
            image?: string | undefined;
            text?: string | undefined;
            displayText?: string | undefined;
            channelData?: unknown;
            imageAltText?: string | undefined;
        }[];
    }>>;
    attachments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        contentType: z.ZodString;
        contentUrl: z.ZodOptional<z.ZodString>;
        content: z.ZodOptional<z.ZodUnknown>;
        name: z.ZodOptional<z.ZodString>;
        thumbnailUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        contentType: string;
        contentUrl?: string | undefined;
        content?: unknown;
        name?: string | undefined;
        thumbnailUrl?: string | undefined;
    }, {
        contentType: string;
        contentUrl?: string | undefined;
        content?: unknown;
        name?: string | undefined;
        thumbnailUrl?: string | undefined;
    }>, "many">>;
    entities: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    channelData: z.ZodOptional<z.ZodAny>;
    action: z.ZodOptional<z.ZodString>;
    replyToId: z.ZodOptional<z.ZodString>;
    label: z.ZodOptional<z.ZodString>;
    valueType: z.ZodOptional<z.ZodString>;
    value: z.ZodOptional<z.ZodUnknown>;
    name: z.ZodOptional<z.ZodUnion<[z.ZodEnum<["ContinueConversation", "CreateConversation"]>, z.ZodString]>>;
    relatesTo: z.ZodOptional<z.ZodObject<{
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
    }>>;
    code: z.ZodOptional<z.ZodUnion<[z.ZodEnum<["unknown", "completedSuccessfully", "userCancelled", "agentTimedOut", "agentIssuedInvalidMessage", "channelFailed"]>, z.ZodString]>>;
    expiration: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodEffects<z.ZodString, Date, string>]>>;
    importance: z.ZodOptional<z.ZodUnion<[z.ZodEnum<["low", "normal", "high"]>, z.ZodString]>>;
    deliveryMode: z.ZodOptional<z.ZodUnion<[z.ZodEnum<["normal", "notification", "expectReplies", "ephemeral"]>, z.ZodString]>>;
    listenFor: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    textHighlights: z.ZodOptional<z.ZodArray<z.ZodObject<{
        text: z.ZodString;
        occurrence: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        text: string;
        occurrence: number;
    }, {
        text: string;
        occurrence: number;
    }>, "many">>;
    semanticAction: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        state: z.ZodUnion<[z.ZodEnum<["start", "continue", "done"]>, z.ZodString]>;
        entities: z.ZodRecord<z.ZodString, z.ZodObject<{
            type: z.ZodString;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            type: z.ZodString;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            type: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        state: string;
        entities: Record<string, z.objectOutputType<{
            type: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>;
    }, {
        id: string;
        state: string;
        entities: Record<string, z.objectInputType<{
            type: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: string;
    value?: unknown;
    code?: string | undefined;
    id?: string | undefined;
    entities?: z.objectOutputType<{
        type: z.ZodString;
    }, z.ZodTypeAny, "passthrough">[] | undefined;
    text?: string | undefined;
    channelData?: any;
    name?: string | undefined;
    locale?: string | undefined;
    conversation?: {
        id: string;
        name?: string | undefined;
        tenantId?: string | undefined;
        aadObjectId?: string | undefined;
        role?: string | undefined;
        properties?: unknown;
        isGroup?: boolean | undefined;
        conversationType?: string | undefined;
    } | undefined;
    channelId?: string | undefined;
    serviceUrl?: string | undefined;
    from?: {
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
    timestamp?: Date | undefined;
    localTimestamp?: Date | undefined;
    localTimezone?: string | undefined;
    callerId?: string | undefined;
    recipient?: {
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
    textFormat?: string | undefined;
    attachmentLayout?: string | undefined;
    membersAdded?: {
        id?: string | undefined;
        name?: string | undefined;
        tenantId?: string | undefined;
        aadObjectId?: string | undefined;
        agenticUserId?: string | undefined;
        agenticAppId?: string | undefined;
        agenticAppBlueprintId?: string | undefined;
        role?: string | undefined;
        properties?: unknown;
    }[] | undefined;
    membersRemoved?: {
        id?: string | undefined;
        name?: string | undefined;
        tenantId?: string | undefined;
        aadObjectId?: string | undefined;
        agenticUserId?: string | undefined;
        agenticAppId?: string | undefined;
        agenticAppBlueprintId?: string | undefined;
        role?: string | undefined;
        properties?: unknown;
    }[] | undefined;
    reactionsAdded?: {
        type: string;
    }[] | undefined;
    reactionsRemoved?: {
        type: string;
    }[] | undefined;
    topicName?: string | undefined;
    historyDisclosed?: boolean | undefined;
    speak?: string | undefined;
    inputHint?: string | undefined;
    summary?: string | undefined;
    suggestedActions?: {
        to: string[];
        actions: {
            type: string;
            title: string;
            value?: any;
            image?: string | undefined;
            text?: string | undefined;
            displayText?: string | undefined;
            channelData?: unknown;
            imageAltText?: string | undefined;
        }[];
    } | undefined;
    attachments?: {
        contentType: string;
        contentUrl?: string | undefined;
        content?: unknown;
        name?: string | undefined;
        thumbnailUrl?: string | undefined;
    }[] | undefined;
    action?: string | undefined;
    replyToId?: string | undefined;
    label?: string | undefined;
    valueType?: string | undefined;
    relatesTo?: {
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
    } | undefined;
    expiration?: Date | undefined;
    importance?: string | undefined;
    deliveryMode?: string | undefined;
    listenFor?: string[] | undefined;
    textHighlights?: {
        text: string;
        occurrence: number;
    }[] | undefined;
    semanticAction?: {
        id: string;
        state: string;
        entities: Record<string, z.objectOutputType<{
            type: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>;
    } | undefined;
}, {
    type: string;
    value?: unknown;
    code?: string | undefined;
    id?: string | undefined;
    entities?: z.objectInputType<{
        type: z.ZodString;
    }, z.ZodTypeAny, "passthrough">[] | undefined;
    text?: string | undefined;
    channelData?: any;
    name?: string | undefined;
    locale?: string | undefined;
    conversation?: {
        id: string;
        name?: string | undefined;
        tenantId?: string | undefined;
        aadObjectId?: string | undefined;
        role?: string | undefined;
        properties?: unknown;
        isGroup?: boolean | undefined;
        conversationType?: string | undefined;
    } | undefined;
    channelId?: string | undefined;
    serviceUrl?: string | undefined;
    from?: {
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
    timestamp?: string | Date | undefined;
    localTimestamp?: string | Date | undefined;
    localTimezone?: string | undefined;
    callerId?: string | undefined;
    recipient?: {
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
    textFormat?: string | undefined;
    attachmentLayout?: string | undefined;
    membersAdded?: {
        id?: string | undefined;
        name?: string | undefined;
        tenantId?: string | undefined;
        aadObjectId?: string | undefined;
        agenticUserId?: string | undefined;
        agenticAppId?: string | undefined;
        agenticAppBlueprintId?: string | undefined;
        role?: string | undefined;
        properties?: unknown;
    }[] | undefined;
    membersRemoved?: {
        id?: string | undefined;
        name?: string | undefined;
        tenantId?: string | undefined;
        aadObjectId?: string | undefined;
        agenticUserId?: string | undefined;
        agenticAppId?: string | undefined;
        agenticAppBlueprintId?: string | undefined;
        role?: string | undefined;
        properties?: unknown;
    }[] | undefined;
    reactionsAdded?: {
        type: string;
    }[] | undefined;
    reactionsRemoved?: {
        type: string;
    }[] | undefined;
    topicName?: string | undefined;
    historyDisclosed?: boolean | undefined;
    speak?: string | undefined;
    inputHint?: string | undefined;
    summary?: string | undefined;
    suggestedActions?: {
        to: string[];
        actions: {
            type: string;
            title: string;
            value?: any;
            image?: string | undefined;
            text?: string | undefined;
            displayText?: string | undefined;
            channelData?: unknown;
            imageAltText?: string | undefined;
        }[];
    } | undefined;
    attachments?: {
        contentType: string;
        contentUrl?: string | undefined;
        content?: unknown;
        name?: string | undefined;
        thumbnailUrl?: string | undefined;
    }[] | undefined;
    action?: string | undefined;
    replyToId?: string | undefined;
    label?: string | undefined;
    valueType?: string | undefined;
    relatesTo?: {
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
    } | undefined;
    expiration?: string | Date | undefined;
    importance?: string | undefined;
    deliveryMode?: string | undefined;
    listenFor?: string[] | undefined;
    textHighlights?: {
        text: string;
        occurrence: number;
    }[] | undefined;
    semanticAction?: {
        id: string;
        state: string;
        entities: Record<string, z.objectInputType<{
            type: z.ZodString;
        }, z.ZodTypeAny, "passthrough">>;
    } | undefined;
}>;
/**
 * Represents an activity in a conversation.
 */
export declare class Activity {
    /**
     * The type of the activity.
     */
    type: ActivityTypes | string;
    /**
     * The text content of the activity.
     */
    text?: string;
    /**
     * The unique identifier of the activity.
     */
    id?: string;
    /**
     * The primary channel ID where the activity originated.
     */
    _channelId?: string;
    /**
     * The account of the sender of the activity.
     */
    from?: ChannelAccount;
    /**
     * The timestamp of the activity.
     */
    timestamp?: Date | string;
    /**
     * The local timestamp of the activity.
     */
    localTimestamp?: Date | string;
    /**
     * The local timezone of the activity.
     */
    localTimezone?: string;
    /**
     * The caller ID of the activity.
     */
    callerId?: string;
    /**
     * The service URL of the activity.
     */
    serviceUrl?: string;
    /**
     * The conversation account associated with the activity.
     */
    conversation?: ConversationAccount;
    /**
     * The recipient of the activity.
     */
    recipient?: ChannelAccount;
    /**
     * The text format of the activity.
     */
    textFormat?: TextFormatTypes | string;
    /**
     * The attachment layout of the activity.
     */
    attachmentLayout?: AttachmentLayoutTypes | string;
    /**
     * The members added to the conversation.
     */
    membersAdded?: ChannelAccount[];
    /**
     * The members removed from the conversation.
     */
    membersRemoved?: ChannelAccount[];
    /**
     * The reactions added to the activity.
     */
    reactionsAdded?: MessageReaction[];
    /**
     * The reactions removed from the activity.
     */
    reactionsRemoved?: MessageReaction[];
    /**
     * The topic name of the activity.
     */
    topicName?: string;
    /**
     * Indicates whether the history is disclosed.
     */
    historyDisclosed?: boolean;
    /**
     * The locale of the activity.
     */
    locale?: string;
    /**
     * The speech text of the activity.
     */
    speak?: string;
    /**
     * The input hint for the activity.
     */
    inputHint?: InputHints | string;
    /**
     * The summary of the activity.
     */
    summary?: string;
    /**
     * The suggested actions for the activity.
     */
    suggestedActions?: SuggestedActions;
    /**
     * The attachments of the activity.
     */
    attachments?: Attachment[];
    /**
     * The entities associated with the activity.
     */
    entities?: Entity[];
    /**
     * The channel-specific data for the activity.
     */
    channelData?: any;
    /**
     * The action associated with the activity.
     */
    action?: string;
    /**
     * The ID of the activity being replied to.
     */
    replyToId?: string;
    /**
     * The label for the activity.
     */
    label?: string;
    /**
     * The value type of the activity.
     */
    valueType?: string;
    /**
     * The value associated with the activity.
     */
    value?: unknown;
    /**
     * The name of the activity event.
     */
    name?: ActivityEventNames | string;
    /**
     * The conversation reference for the activity.
     */
    relatesTo?: ConversationReference;
    /**
     * The end-of-conversation code for the activity.
     */
    code?: EndOfConversationCodes | string;
    /**
     * The expiration time of the activity.
     */
    expiration?: string | Date;
    /**
     * The importance of the activity.
     */
    importance?: ActivityImportance | string;
    /**
     * The delivery mode of the activity.
     */
    deliveryMode?: DeliveryModes | string;
    /**
     * The list of keywords to listen for in the activity.
     */
    listenFor?: string[];
    /**
     * The text highlights in the activity.
     */
    textHighlights?: TextHighlight[];
    /**
     * The semantic action associated with the activity.
     */
    semanticAction?: SemanticAction;
    /**
     * The raw timestamp of the activity.
     */
    rawTimestamp?: string;
    /**
     * The raw expiration time of the activity.
     */
    rawExpiration?: string;
    /**
     * The raw local timestamp of the activity.
     */
    rawLocalTimestamp?: string;
    /**
     * Additional properties of the activity.
     */
    [x: string]: unknown;
    /**
     * Creates a new Activity instance.
     * @param t The type of the activity.
     * @throws Will throw an error if the activity type is invalid.
     */
    constructor(t: ActivityTypes | string);
    /**
     * Creates an Activity instance from a JSON string.
     * @param json The JSON string representing the activity.
     * @returns The created Activity instance.
     */
    static fromJson(json: string): Activity;
    /**
     * Creates an Activity instance from an object.
     * @param o The object representing the activity.
     * @returns The created Activity instance.
     */
    static fromObject(o: object): Activity;
    /**
     * Return the combined channel:subChannel value like agent:email
     */
    get channelId(): string | undefined;
    /**
     * Given a composite channelId like agent:email, return the channel and subChannel.
     * @param value
     * @returns [channel, subChannel]
     */
    static parseChannelId(value: string): [string | undefined, string | undefined];
    /**
     * Sets the channel ID for the activity - if a subChannel is provided, will create the necessary ProductInfo entity
     * @param value The channel ID value.
     */
    set channelId(value: string);
    /**
     * Sets the primary channel ID for the activity.
     */
    set channelIdChannel(value: string | undefined);
    /**
     * Returns the primary channel ID for the activity.
     */
    get channelIdChannel(): string | undefined;
    /**
     * Returns the sub-channel ID for the activity.
     */
    get channelIdSubChannel(): unknown;
    /**
     * Sets the sub-channel ID for the activity.
     */
    set channelIdSubChannel(value: unknown);
    /**
     * Creates a continuation activity from a conversation reference.
     * @param reference The conversation reference.
     * @returns The created continuation activity.
     */
    static getContinuationActivity(reference: ConversationReference): Activity;
    /**
     * Gets the appropriate reply-to ID for the activity.
     * @returns The reply-to ID, or undefined if not applicable.
     */
    private getAppropriateReplyToId;
    /**
     * Gets the conversation reference for the activity.
     * @returns The conversation reference.
     * @throws Will throw an error if required properties are undefined.
     */
    getConversationReference(): ConversationReference;
    /**
     * Applies a conversation reference to the activity.
     * @param reference The conversation reference.
     * @param isIncoming Whether the activity is incoming.
     * @returns The updated activity.
     */
    applyConversationReference(reference: ConversationReference, isIncoming?: boolean): Activity;
    clone(): Activity;
    /**
     * Gets the mentions in the activity.
     * @param activity The activity.
     * @returns The list of mentions.
     */
    getMentions(activity: Activity): Mention[];
    /**
     * Normalizes mentions in the activity by removing mention tags and optionally removing recipient mention.
     * @param removeMention Whether to remove the recipient mention from the activity.
     */
    normalizeMentions(removeMention?: boolean): void;
    /**
     * Removes <at> </at> tags from the specified text.
     * @param text The text to process.
     * @returns The text with <at> </at> tags removed.
     */
    private static removeAt;
    /**
     * Removes the mention text for a given ID.
     * @param id The ID of the mention to remove.
     * @returns The updated text.
     */
    removeMentionText(id: string): string;
    /**
     * Removes the recipient mention from the activity text.
     * @returns The updated text.
     */
    removeRecipientMention(): string;
    /**
     * Gets the conversation reference for a reply.
     * @param replyId The ID of the reply.
     * @returns The conversation reference.
     */
    getReplyConversationReference(replyId: string): ConversationReference;
    toJsonString(): string;
    /**
     * Does this activity represent an agentic request?
     * @returns True if agentic
     */
    isAgenticRequest(): boolean;
    /**
     * Retrieves the tenant ID associated with the agentic recipient of the activity, if available; otherwise, returns the tenant ID from the conversation.
     * @returns The tenant ID of the agentic recipient if present; otherwise, the tenant ID from the conversation. Returns undefined if neither is available.
     */
    getAgenticTenantId(): string | undefined;
    /**
     * Gets the agent instance ID from the context if its agentic
     * @returns agent instance id as string
     */
    getAgenticInstanceId(): string | undefined;
    /**
     * Gets the agentic user (UPN) from the context if it's an agentic request.
     */
    getAgenticUser(): string | undefined;
}
