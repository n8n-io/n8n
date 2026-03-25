// zod-compat.ts
// ----------------------------------------------------
// Unified types + helpers to accept Zod v3 and v4 (Mini)
// ----------------------------------------------------
import * as z3rt from 'zod/v3';
import * as z4mini from 'zod/v4-mini';
// --- Runtime detection ---
export function isZ4Schema(s) {
    // Present on Zod 4 (Classic & Mini) schemas; absent on Zod 3
    const schema = s;
    return !!schema._zod;
}
// --- Schema construction ---
export function objectFromShape(shape) {
    const values = Object.values(shape);
    if (values.length === 0)
        return z4mini.object({}); // default to v4 Mini
    const allV4 = values.every(isZ4Schema);
    const allV3 = values.every(s => !isZ4Schema(s));
    if (allV4)
        return z4mini.object(shape);
    if (allV3)
        return z3rt.object(shape);
    throw new Error('Mixed Zod versions detected in object shape.');
}
// --- Unified parsing ---
export function safeParse(schema, data) {
    if (isZ4Schema(schema)) {
        // Mini exposes top-level safeParse
        const result = z4mini.safeParse(schema, data);
        return result;
    }
    const v3Schema = schema;
    const result = v3Schema.safeParse(data);
    return result;
}
export async function safeParseAsync(schema, data) {
    if (isZ4Schema(schema)) {
        // Mini exposes top-level safeParseAsync
        const result = await z4mini.safeParseAsync(schema, data);
        return result;
    }
    const v3Schema = schema;
    const result = await v3Schema.safeParseAsync(data);
    return result;
}
// --- Shape extraction ---
export function getObjectShape(schema) {
    if (!schema)
        return undefined;
    // Zod v3 exposes `.shape`; Zod v4 keeps the shape on `_zod.def.shape`
    let rawShape;
    if (isZ4Schema(schema)) {
        const v4Schema = schema;
        rawShape = v4Schema._zod?.def?.shape;
    }
    else {
        const v3Schema = schema;
        rawShape = v3Schema.shape;
    }
    if (!rawShape)
        return undefined;
    if (typeof rawShape === 'function') {
        try {
            return rawShape();
        }
        catch {
            return undefined;
        }
    }
    return rawShape;
}
// --- Schema normalization ---
/**
 * Normalizes a schema to an object schema. Handles both:
 * - Already-constructed object schemas (v3 or v4)
 * - Raw shapes that need to be wrapped into object schemas
 */
export function normalizeObjectSchema(schema) {
    if (!schema)
        return undefined;
    // First check if it's a raw shape (Record<string, AnySchema>)
    // Raw shapes don't have _def or _zod properties and aren't schemas themselves
    if (typeof schema === 'object') {
        // Check if it's actually a ZodRawShapeCompat (not a schema instance)
        // by checking if it lacks schema-like internal properties
        const asV3 = schema;
        const asV4 = schema;
        // If it's not a schema instance (no _def or _zod), it might be a raw shape
        if (!asV3._def && !asV4._zod) {
            // Check if all values are schemas (heuristic to confirm it's a raw shape)
            const values = Object.values(schema);
            if (values.length > 0 &&
                values.every(v => typeof v === 'object' &&
                    v !== null &&
                    (v._def !== undefined ||
                        v._zod !== undefined ||
                        typeof v.parse === 'function'))) {
                return objectFromShape(schema);
            }
        }
    }
    // If we get here, it should be an AnySchema (not a raw shape)
    // Check if it's already an object schema
    if (isZ4Schema(schema)) {
        // Check if it's a v4 object
        const v4Schema = schema;
        const def = v4Schema._zod?.def;
        if (def && (def.type === 'object' || def.shape !== undefined)) {
            return schema;
        }
    }
    else {
        // Check if it's a v3 object
        const v3Schema = schema;
        if (v3Schema.shape !== undefined) {
            return schema;
        }
    }
    return undefined;
}
// --- Error message extraction ---
/**
 * Safely extracts an error message from a parse result error.
 * Zod errors can have different structures, so we handle various cases.
 */
export function getParseErrorMessage(error) {
    if (error && typeof error === 'object') {
        // Try common error structures
        if ('message' in error && typeof error.message === 'string') {
            return error.message;
        }
        if ('issues' in error && Array.isArray(error.issues) && error.issues.length > 0) {
            const firstIssue = error.issues[0];
            if (firstIssue && typeof firstIssue === 'object' && 'message' in firstIssue) {
                return String(firstIssue.message);
            }
        }
        // Fallback: try to stringify the error
        try {
            return JSON.stringify(error);
        }
        catch {
            return String(error);
        }
    }
    return String(error);
}
// --- Schema metadata access ---
/**
 * Gets the description from a schema, if available.
 * Works with both Zod v3 and v4.
 *
 * Both versions expose a `.description` getter that returns the description
 * from their respective internal storage (v3: _def, v4: globalRegistry).
 */
export function getSchemaDescription(schema) {
    return schema.description;
}
/**
 * Checks if a schema is optional.
 * Works with both Zod v3 and v4.
 */
export function isSchemaOptional(schema) {
    if (isZ4Schema(schema)) {
        const v4Schema = schema;
        return v4Schema._zod?.def?.type === 'optional';
    }
    const v3Schema = schema;
    // v3 has isOptional() method
    if (typeof schema.isOptional === 'function') {
        return schema.isOptional();
    }
    return v3Schema._def?.typeName === 'ZodOptional';
}
/**
 * Gets the literal value from a schema, if it's a literal schema.
 * Works with both Zod v3 and v4.
 * Returns undefined if the schema is not a literal or the value cannot be determined.
 */
export function getLiteralValue(schema) {
    if (isZ4Schema(schema)) {
        const v4Schema = schema;
        const def = v4Schema._zod?.def;
        if (def) {
            // Try various ways to get the literal value
            if (def.value !== undefined)
                return def.value;
            if (Array.isArray(def.values) && def.values.length > 0) {
                return def.values[0];
            }
        }
    }
    const v3Schema = schema;
    const def = v3Schema._def;
    if (def) {
        if (def.value !== undefined)
            return def.value;
        if (Array.isArray(def.values) && def.values.length > 0) {
            return def.values[0];
        }
    }
    // Fallback: check for direct value property (some Zod versions)
    const directValue = schema.value;
    if (directValue !== undefined)
        return directValue;
    return undefined;
}
//# sourceMappingURL=zod-compat.js.map