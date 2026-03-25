/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { z } from 'zod';
import { ActionTypes } from './actionTypes';
/**
 * Represents a card action.
 */
export interface CardAction {
    /**
     * Type of the action.
     */
    type: ActionTypes | string;
    /**
     * Title of the action.
     */
    title: string;
    /**
     * URL of the image associated with the action.
     */
    image?: string;
    /**
     * Text associated with the action.
     */
    text?: string;
    /**
     * Display text for the action.
     */
    displayText?: string;
    /**
     * Value associated with the action.
     */
    value?: any;
    /**
     * Channel-specific data associated with the action.
     */
    channelData?: unknown;
    /**
     * Alt text for the image.
     */
    imageAltText?: string;
}
/**
 * Zod schema for validating CardAction.
 */
export declare const cardActionZodSchema: z.ZodObject<{
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
}>;
