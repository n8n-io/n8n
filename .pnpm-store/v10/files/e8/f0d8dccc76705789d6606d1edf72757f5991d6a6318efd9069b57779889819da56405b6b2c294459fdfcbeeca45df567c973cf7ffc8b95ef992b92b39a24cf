/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
import { z } from 'zod';
import { RoleTypes } from './roleTypes';
import { MembershipSource } from './membershipSource';
/**
 * Represents a channel account.
 */
export interface ChannelAccount {
    /**
     * The unique identifier of the channel account.
     */
    id?: string;
    /**
     * The name of the channel account.
     */
    name?: string;
    /**
     * The Azure Active Directory object ID of the channel account.
     */
    aadObjectId?: string;
    /**
     * Tenant ID of the user.
     */
    tenantId?: string;
    /**
     * The UPN of an agentic user
     */
    agenticUserId?: string;
    /**
     * The client ID of an agentic app
     */
    agenticAppId?: string;
    /**
     * The parent blueprint ID of an agentic instance
     */
    agenticAppBlueprintId?: string;
    /**
     * The role of the channel account.
     */
    role?: RoleTypes | string;
    /**
     * Additional properties of the channel account.
     */
    properties?: unknown;
    /**
     * List of membership sources associated with the channel account.
     */
    membershipSources?: MembershipSource[];
}
/**
 * Zod schema for validating a channel account.
 */
export declare const channelAccountZodSchema: z.ZodObject<{
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
}>;
