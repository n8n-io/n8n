/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { z } from 'zod';
/**
 * Represents an attachment.
 */
export interface Attachment {
    /**
     * The MIME type of the attachment content.
     */
    contentType: string;
    /**
     * The URL of the attachment content.
     */
    contentUrl?: string;
    /**
     * The content of the attachment.
     */
    content?: unknown;
    /**
     * The name of the attachment.
     */
    name?: string;
    /**
     * The URL of the thumbnail for the attachment.
     */
    thumbnailUrl?: string;
}
/**
 * Zod schema for validating attachments.
 */
export declare const attachmentZodSchema: z.ZodObject<{
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
}>;
