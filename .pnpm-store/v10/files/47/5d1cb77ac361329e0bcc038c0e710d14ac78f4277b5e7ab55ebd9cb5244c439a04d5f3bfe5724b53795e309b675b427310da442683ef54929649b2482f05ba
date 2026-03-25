import { BaseSchema, Schema } from "../../Schema";
export declare type ObjectLikeSchema<Raw, Parsed> = Schema<Raw, Parsed> & BaseSchema<Raw, Parsed> & ObjectLikeUtils<Raw, Parsed>;
export interface ObjectLikeUtils<Raw, Parsed> {
    withParsedProperties: <T extends Record<string, any>>(properties: {
        [K in keyof T]: T[K] | ((parsed: Parsed) => T[K]);
    }) => ObjectLikeSchema<Raw, Parsed & T>;
}
