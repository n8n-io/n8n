/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { z } from 'zod';
/**
 * Represents a text highlight.
 */
export interface TextHighlight {
    /**
     * The highlighted text.
     */
    text: string;
    /**
     * The occurrence count of the highlighted text.
     */
    occurrence: number;
}
/**
 * Zod schema for validating TextHighlight objects.
 */
export declare const textHighlightZodSchema: z.ZodObject<{
    text: z.ZodString;
    occurrence: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    text: string;
    occurrence: number;
}, {
    text: string;
    occurrence: number;
}>;
