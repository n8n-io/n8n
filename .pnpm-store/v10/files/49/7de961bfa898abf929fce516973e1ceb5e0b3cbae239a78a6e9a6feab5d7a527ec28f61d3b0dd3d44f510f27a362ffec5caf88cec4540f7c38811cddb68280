import { BaseSchema, Schema, SchemaOptions } from "../../Schema";
export interface SchemaUtils<Raw, Parsed> {
    optional: () => Schema<Raw | null | undefined, Parsed | undefined>;
    transform: <Transformed>(transformer: SchemaTransformer<Parsed, Transformed>) => Schema<Raw, Transformed>;
    parseOrThrow: (raw: unknown, opts?: SchemaOptions) => Parsed;
    jsonOrThrow: (raw: unknown, opts?: SchemaOptions) => Raw;
}
export interface SchemaTransformer<Parsed, Transformed> {
    transform: (parsed: Parsed) => Transformed;
    untransform: (transformed: any) => Parsed;
}
export declare function getSchemaUtils<Raw, Parsed>(schema: BaseSchema<Raw, Parsed>): SchemaUtils<Raw, Parsed>;
/**
 * schema utils are defined in one file to resolve issues with circular imports
 */
export declare function optional<Raw, Parsed>(schema: BaseSchema<Raw, Parsed>): Schema<Raw | null | undefined, Parsed | undefined>;
export declare function transform<Raw, Parsed, Transformed>(schema: BaseSchema<Raw, Parsed>, transformer: SchemaTransformer<Parsed, Transformed>): Schema<Raw, Transformed>;
