import { inferParsedPropertySchema, inferRawObjectFromPropertySchemas, ObjectSchema, PropertySchemas } from "./types";
export declare function objectWithoutOptionalProperties<ParsedKeys extends string, T extends PropertySchemas<ParsedKeys>>(schemas: T): inferObjectWithoutOptionalPropertiesSchemaFromPropertySchemas<T>;
export declare type inferObjectWithoutOptionalPropertiesSchemaFromPropertySchemas<T extends PropertySchemas<keyof T>> = ObjectSchema<inferRawObjectFromPropertySchemas<T>, inferParsedObjectWithoutOptionalPropertiesFromPropertySchemas<T>>;
export declare type inferParsedObjectWithoutOptionalPropertiesFromPropertySchemas<T extends PropertySchemas<keyof T>> = {
    [K in keyof T]: inferParsedPropertySchema<T[K]>;
};
