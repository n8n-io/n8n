import type { JSONSchemaReference } from "../definitions";
import type { DeserializationPattern } from "./deserializationPattern";
import type { ExtendedJSONSchemaReference, JSONSchemaExtension } from "./extendedJsonSchema";
export type FromSchemaOptions = {
    parseNotKeyword?: boolean;
    parseIfThenElseKeywords?: boolean;
    keepDefaultedPropertiesOptional?: boolean;
    references?: JSONSchemaReference[] | false;
    deserialize?: DeserializationPattern[] | false;
};
export type FromExtendedSchemaOptions<EXTENSION extends JSONSchemaExtension> = {
    parseNotKeyword?: boolean;
    parseIfThenElseKeywords?: boolean;
    keepDefaultedPropertiesOptional?: boolean;
    references?: ExtendedJSONSchemaReference<EXTENSION>[] | false;
    deserialize?: DeserializationPattern[] | false;
};
export type FromSchemaDefaultOptions = {
    parseNotKeyword: false;
    parseIfThenElseKeywords: false;
    keepDefaultedPropertiesOptional: false;
    references: false;
    deserialize: false;
};
