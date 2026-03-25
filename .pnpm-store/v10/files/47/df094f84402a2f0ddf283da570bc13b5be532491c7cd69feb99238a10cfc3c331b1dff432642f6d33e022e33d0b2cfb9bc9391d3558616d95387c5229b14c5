/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { z } from 'zod';
import { Entity } from '../entity/entity';
import { SemanticActionStateTypes } from './semanticActionStateTypes';
/**
 * Represents a semantic action.
 */
export interface SemanticAction {
    /**
     * Unique identifier for the semantic action.
     */
    id: string;
    /**
     * State of the semantic action.
     */
    state: SemanticActionStateTypes | string;
    /**
     * Entities associated with the semantic action.
     */
    entities: {
        [propertyName: string]: Entity;
    };
}
/**
 * Zod schema for validating SemanticAction.
 */
export declare const semanticActionZodSchema: z.ZodObject<{
    id: z.ZodString;
    state: z.ZodUnion<[z.ZodEnum<["start", "continue", "done"]>, z.ZodString]>;
    entities: z.ZodRecord<z.ZodString, z.ZodObject<{
        type: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        type: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        type: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    state: string;
    entities: Record<string, z.objectOutputType<{
        type: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>;
}, {
    id: string;
    state: string;
    entities: Record<string, z.objectInputType<{
        type: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>;
}>;
