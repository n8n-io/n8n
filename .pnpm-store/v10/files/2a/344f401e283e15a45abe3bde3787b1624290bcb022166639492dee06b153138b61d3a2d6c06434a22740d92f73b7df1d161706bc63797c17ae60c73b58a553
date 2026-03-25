/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { z } from 'zod';
/**
 * Represents a generic Entity.
 */
export interface Entity {
    /**
     * The type of the entity.
     */
    type: string;
    /**
     * Additional properties of the entity.
     */
    [key: string]: unknown;
}
/**
 * Zod schema for validating Entity objects.
 */
export declare const entityZodSchema: z.ZodObject<{
    type: z.ZodString;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    type: z.ZodString;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    type: z.ZodString;
}, z.ZodTypeAny, "passthrough">>;
