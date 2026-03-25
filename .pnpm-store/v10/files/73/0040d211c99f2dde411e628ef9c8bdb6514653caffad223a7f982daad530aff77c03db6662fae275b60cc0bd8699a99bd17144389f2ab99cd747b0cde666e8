/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { z } from 'zod';
/**
 * Represents an adaptive card invoke action.
 */
export interface AdaptiveCardInvokeAction {
    /**
     * The type of the action.
     */
    type: string;
    /**
     * The unique identifier of the action.
     */
    id?: string;
    /**
     * The verb associated with the action.
     */
    verb: string;
    /**
     * Additional data associated with the action.
     */
    data: Record<string, any>;
}
/**
 * Zod schema for validating an adaptive card invoke action.
 */
export declare const adaptiveCardInvokeActionZodSchema: z.ZodObject<{
    type: z.ZodString;
    id: z.ZodOptional<z.ZodString>;
    verb: z.ZodString;
    data: z.ZodRecord<z.ZodString, z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    type: string;
    verb: string;
    data: Record<string, any>;
    id?: string | undefined;
}, {
    type: string;
    verb: string;
    data: Record<string, any>;
    id?: string | undefined;
}>;
