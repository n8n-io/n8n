import type * as z3 from 'zod/v3';
import type * as z4 from 'zod/v4/core';
export type AnySchema = z3.ZodTypeAny | z4.$ZodType;
export type AnyObjectSchema = z3.AnyZodObject | z4.$ZodObject | AnySchema;
export type ZodRawShapeCompat = Record<string, AnySchema>;
export interface ZodV3Internal {
    _def?: {
        typeName?: string;
        value?: unknown;
        values?: unknown[];
        shape?: Record<string, AnySchema> | (() => Record<string, AnySchema>);
        description?: string;
    };
    shape?: Record<string, AnySchema> | (() => Record<string, AnySchema>);
    value?: unknown;
}
export interface ZodV4Internal {
    _zod?: {
        def?: {
            type?: string;
            value?: unknown;
            values?: unknown[];
            shape?: Record<string, AnySchema> | (() => Record<string, AnySchema>);
        };
    };
    value?: unknown;
}
export type SchemaOutput<S> = S extends z3.ZodTypeAny ? z3.infer<S> : S extends z4.$ZodType ? z4.output<S> : never;
export type SchemaInput<S> = S extends z3.ZodTypeAny ? z3.input<S> : S extends z4.$ZodType ? z4.input<S> : never;
/**
 * Infers the output type from a ZodRawShapeCompat (raw shape object).
 * Maps over each key in the shape and infers the output type from each schema.
 */
export type ShapeOutput<Shape extends ZodRawShapeCompat> = {
    [K in keyof Shape]: SchemaOutput<Shape[K]>;
};
export declare function isZ4Schema(s: AnySchema): s is z4.$ZodType;
export declare function objectFromShape(shape: ZodRawShapeCompat): AnyObjectSchema;
export declare function safeParse<S extends AnySchema>(schema: S, data: unknown): {
    success: true;
    data: SchemaOutput<S>;
} | {
    success: false;
    error: unknown;
};
export declare function safeParseAsync<S extends AnySchema>(schema: S, data: unknown): Promise<{
    success: true;
    data: SchemaOutput<S>;
} | {
    success: false;
    error: unknown;
}>;
export declare function getObjectShape(schema: AnyObjectSchema | undefined): Record<string, AnySchema> | undefined;
/**
 * Normalizes a schema to an object schema. Handles both:
 * - Already-constructed object schemas (v3 or v4)
 * - Raw shapes that need to be wrapped into object schemas
 */
export declare function normalizeObjectSchema(schema: AnySchema | ZodRawShapeCompat | undefined): AnyObjectSchema | undefined;
/**
 * Safely extracts an error message from a parse result error.
 * Zod errors can have different structures, so we handle various cases.
 */
export declare function getParseErrorMessage(error: unknown): string;
/**
 * Gets the description from a schema, if available.
 * Works with both Zod v3 and v4.
 *
 * Both versions expose a `.description` getter that returns the description
 * from their respective internal storage (v3: _def, v4: globalRegistry).
 */
export declare function getSchemaDescription(schema: AnySchema): string | undefined;
/**
 * Checks if a schema is optional.
 * Works with both Zod v3 and v4.
 */
export declare function isSchemaOptional(schema: AnySchema): boolean;
/**
 * Gets the literal value from a schema, if it's a literal schema.
 * Works with both Zod v3 and v4.
 * Returns undefined if the schema is not a literal or the value cannot be determined.
 */
export declare function getLiteralValue(schema: AnySchema): unknown;
//# sourceMappingURL=zod-compat.d.ts.map