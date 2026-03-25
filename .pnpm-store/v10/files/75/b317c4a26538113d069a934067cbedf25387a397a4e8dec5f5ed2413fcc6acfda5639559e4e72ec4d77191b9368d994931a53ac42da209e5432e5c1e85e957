/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
import { z } from 'zod';
import { MembershipSourceTypes } from './membershipSourceTypes';
import { MembershipTypes } from './membershipTypes';
/**
 * Interface representing a membership source.
 */
export interface MembershipSource {
    /**
     * The type of roster the user is a member of.
     */
    sourceType: MembershipSourceTypes;
    /**
     * The unique identifier of the membership source.
     */
    id: string;
    /**
     * The users relationship to the current channel.
     */
    membershipType: MembershipTypes;
    /**
     * The group ID of the team associated with this membership source.
     */
    teamGroupId: string;
    /**
     * Optional. The tenant ID for the user.
     */
    tenantId?: string;
}
/**
 * Zod schema for validating a membership source.
 */
export declare const membershipSourceZodSchema: z.ZodObject<{
    sourceType: z.ZodEnum<["channel", "team"]>;
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    membershipType: z.ZodEnum<["direct", "transitive"]>;
    teamGroupId: z.ZodOptional<z.ZodString>;
    tenantId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    sourceType: "channel" | "team";
    membershipType: "direct" | "transitive";
    name?: string | undefined;
    teamGroupId?: string | undefined;
    tenantId?: string | undefined;
}, {
    id: string;
    sourceType: "channel" | "team";
    membershipType: "direct" | "transitive";
    name?: string | undefined;
    teamGroupId?: string | undefined;
    tenantId?: string | undefined;
}>;
