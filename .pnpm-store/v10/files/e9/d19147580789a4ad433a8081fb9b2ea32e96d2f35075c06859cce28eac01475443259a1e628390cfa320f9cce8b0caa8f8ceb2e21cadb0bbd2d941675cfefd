import { SchemaUtils } from "./builders";
export declare type Schema<Raw = unknown, Parsed = unknown> = BaseSchema<Raw, Parsed> & SchemaUtils<Raw, Parsed>;
export declare type inferRaw<S extends Schema> = S extends Schema<infer Raw, any> ? Raw : never;
export declare type inferParsed<S extends Schema> = S extends Schema<any, infer Parsed> ? Parsed : never;
export interface BaseSchema<Raw, Parsed> {
    parse: (raw: unknown, opts?: SchemaOptions) => MaybeValid<Parsed>;
    json: (parsed: unknown, opts?: SchemaOptions) => MaybeValid<Raw>;
    getType: () => SchemaType | SchemaType;
}
export declare const SchemaType: {
    readonly DATE: "date";
    readonly ENUM: "enum";
    readonly LIST: "list";
    readonly STRING_LITERAL: "stringLiteral";
    readonly BOOLEAN_LITERAL: "booleanLiteral";
    readonly OBJECT: "object";
    readonly ANY: "any";
    readonly BOOLEAN: "boolean";
    readonly NUMBER: "number";
    readonly STRING: "string";
    readonly UNKNOWN: "unknown";
    readonly RECORD: "record";
    readonly SET: "set";
    readonly UNION: "union";
    readonly UNDISCRIMINATED_UNION: "undiscriminatedUnion";
    readonly OPTIONAL: "optional";
};
export declare type SchemaType = typeof SchemaType[keyof typeof SchemaType];
export declare type MaybeValid<T> = Valid<T> | Invalid;
export interface Valid<T> {
    ok: true;
    value: T;
}
export interface Invalid {
    ok: false;
    errors: ValidationError[];
}
export interface ValidationError {
    path: string[];
    message: string;
}
export interface SchemaOptions {
    /**
     * how to handle unrecognized keys in objects
     *
     * @default "fail"
     */
    unrecognizedObjectKeys?: "fail" | "passthrough" | "strip";
    /**
     * whether to fail when an unrecognized discriminant value is
     * encountered in a union
     *
     * @default false
     */
    allowUnrecognizedUnionMembers?: boolean;
    /**
     * whether to fail when an unrecognized enum value is encountered
     *
     * @default false
     */
    allowUnrecognizedEnumValues?: boolean;
    /**
     * whether to allow data that doesn't conform to the schema.
     * invalid data is passed through without transformation.
     *
     * when this is enabled, .parse() and .json() will always
     * return `ok: true`. `.parseOrThrow()` and `.jsonOrThrow()`
     * will never fail.
     *
     * @default false
     */
    skipValidation?: boolean;
    /**
     * each validation failure contains a "path" property, which is
     * the breadcrumbs to the offending node in the JSON. you can supply
     * a prefix that is prepended to all the errors' paths. this can be
     * helpful for zurg's internal debug logging.
     */
    breadcrumbsPrefix?: string[];
    /**
     * whether to send 'null' for optional properties explicitly set to 'undefined'.
     */
    omitUndefined?: boolean;
}
