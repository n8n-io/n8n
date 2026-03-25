import { BaseSchema } from "../../Schema";
import { ObjectLikeSchema, ObjectLikeUtils } from "./types";
export declare function getObjectLikeUtils<Raw, Parsed>(schema: BaseSchema<Raw, Parsed>): ObjectLikeUtils<Raw, Parsed>;
/**
 * object-like utils are defined in one file to resolve issues with circular imports
 */
export declare function withParsedProperties<RawObjectShape, ParsedObjectShape, Properties>(objectLike: BaseSchema<RawObjectShape, ParsedObjectShape>, properties: {
    [K in keyof Properties]: Properties[K] | ((parsed: ParsedObjectShape) => Properties[K]);
}): ObjectLikeSchema<RawObjectShape, ParsedObjectShape & Properties>;
