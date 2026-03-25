/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { z } from 'zod';
import { MessageReactionTypes } from './messageReactionTypes';
/**
 * Represents a message reaction.
 */
export interface MessageReaction {
    /**
     * The type of the reaction.
     */
    type: MessageReactionTypes | string;
}
/**
 * Zod schema for validating a MessageReaction object.
 */
export declare const messageReactionZodSchema: z.ZodObject<{
    type: z.ZodUnion<[z.ZodEnum<["like", "plusOne"]>, z.ZodString]>;
}, "strip", z.ZodTypeAny, {
    type: string;
}, {
    type: string;
}>;
