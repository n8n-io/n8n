import type { M } from "ts-algebra";
import type { DeserializationPattern, JSONSchema } from "../definitions";
import type { ParseSchemaOptions } from "./index";
export type DeserializeSchema<SCHEMA extends JSONSchema, OPTIONS extends Omit<ParseSchemaOptions, "deserialize"> & {
    deserialize: DeserializationPattern[];
}> = RecurseOnDeserializationPatterns<SCHEMA, OPTIONS["deserialize"]>;
type RecurseOnDeserializationPatterns<SCHEMA extends JSONSchema, DESERIALIZATION_PATTERNS extends DeserializationPattern[], RESULT = M.Any> = DESERIALIZATION_PATTERNS extends [
    infer DESERIALIZATION_PATTERNS_HEAD,
    ...infer DESERIALIZATION_PATTERNS_TAIL
] ? DESERIALIZATION_PATTERNS_HEAD extends DeserializationPattern ? DESERIALIZATION_PATTERNS_TAIL extends DeserializationPattern[] ? RecurseOnDeserializationPatterns<SCHEMA, DESERIALIZATION_PATTERNS_TAIL, SCHEMA extends DESERIALIZATION_PATTERNS_HEAD["pattern"] ? M.$Intersect<M.Any<true, DESERIALIZATION_PATTERNS_HEAD["output"]>, RESULT> : RESULT> : never : never : RESULT;
export {};
