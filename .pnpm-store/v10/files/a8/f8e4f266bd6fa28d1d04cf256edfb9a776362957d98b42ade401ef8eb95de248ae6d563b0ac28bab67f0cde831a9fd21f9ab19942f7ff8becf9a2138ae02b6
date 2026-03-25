/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { z } from 'zod';
import { CardAction } from './cardAction';
/**
 * Represents suggested actions.
 */
export interface SuggestedActions {
    /**
     * Array of recipient IDs.
     */
    to: string[];
    /**
     * Array of card actions.
     */
    actions: CardAction[];
}
/**
 * Zod schema for validating SuggestedActions.
 */
export declare const suggestedActionsZodSchema: z.ZodObject<{
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
}>;
