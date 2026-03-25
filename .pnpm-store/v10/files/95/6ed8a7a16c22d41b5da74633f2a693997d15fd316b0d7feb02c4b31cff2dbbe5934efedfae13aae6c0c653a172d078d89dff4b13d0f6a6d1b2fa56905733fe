export declare enum SchemaTypes {
    BOOL = 0,
    STRING = 1,
    NUMBER = 2
}
type Coercer = (val: string) => string | number | boolean | null;
type Validator = (val: string | number | boolean) => boolean;
export interface SchemaItem {
    type: SchemaTypes;
    allowedValues?: (string | number | boolean)[];
    default?: string | number | boolean;
    aliases?: string[];
    canonical?: string;
    coerce?: Coercer;
    validator?: Validator;
}
export interface SchemaDefinition {
    [name: string]: SchemaItem;
}
export declare const SCHEMA: SchemaDefinition;
export default function parseSqlConnectionString(connectionString: string, canonicalProps?: boolean, allowUnknown?: boolean, strict?: boolean, schema?: SchemaDefinition): Record<string, string | number | boolean>;
export {};
//# sourceMappingURL=sql-connection-string.d.ts.map