import { AnySchema, AnyObjectSchema } from './zod-compat.js';
type JsonSchema = Record<string, unknown>;
type CommonOpts = {
    strictUnions?: boolean;
    pipeStrategy?: 'input' | 'output';
    target?: 'jsonSchema7' | 'draft-7' | 'jsonSchema2019-09' | 'draft-2020-12';
};
export declare function toJsonSchemaCompat(schema: AnyObjectSchema, opts?: CommonOpts): JsonSchema;
export declare function getMethodLiteral(schema: AnyObjectSchema): string;
export declare function parseWithCompat(schema: AnySchema, data: unknown): unknown;
export {};
//# sourceMappingURL=zod-json-schema-compat.d.ts.map