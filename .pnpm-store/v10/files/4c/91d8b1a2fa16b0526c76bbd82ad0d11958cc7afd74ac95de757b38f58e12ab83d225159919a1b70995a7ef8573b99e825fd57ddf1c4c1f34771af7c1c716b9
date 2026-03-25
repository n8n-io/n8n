/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
import { z } from 'zod';
import { RoleTypes } from './roleTypes';
/**
 * Represents a conversation account.
 */
export interface ConversationAccount {
    /**
     * The unique identifier of the conversation account.
     */
    id: string;
    /**
     * The type of the conversation (e.g., personal, group, etc.).
     */
    conversationType?: string;
    /**
     * The tenant ID associated with the conversation account.
     */
    tenantId?: string;
    /**
     * Indicates whether the conversation is a group.
     */
    isGroup?: boolean;
    /**
     * The name of the conversation account.
     */
    name?: string;
    /**
     * The Azure Active Directory object ID of the conversation account.
     */
    aadObjectId?: string;
    /**
     * The role of the conversation account.
     */
    role?: RoleTypes | string;
    /**
     * Additional properties of the conversation account.
     */
    properties?: unknown;
}
/**
 * Zod schema for validating a conversation account.
 */
export declare const conversationAccountZodSchema: z.ZodObject<{
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
