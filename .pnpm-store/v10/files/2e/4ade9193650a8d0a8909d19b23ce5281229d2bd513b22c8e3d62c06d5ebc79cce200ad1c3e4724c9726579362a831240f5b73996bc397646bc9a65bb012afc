import type { M } from "ts-algebra";
import type { JSONSchema } from "../definitions";
import type { And, DoesExtend, Not, Tail } from "../type-utils";
import type { ParseSchema, ParseSchemaOptions } from "./index";
export type ArrayOrTupleSchema = JSONSchema & Readonly<{
    type: "array";
}>;
export type ArraySchema = Omit<JSONSchema, "items"> & Readonly<{
    type: "array";
    items: JSONSchema;
}>;
export type TupleSchema = JSONSchema & Readonly<{
    type: "array";
    items: readonly JSONSchema[];
}>;
export type ParseArrayOrTupleSchema<ARRAY_OR_TUPLE_SCHEMA extends ArrayOrTupleSchema, OPTIONS extends ParseSchemaOptions> = ARRAY_OR_TUPLE_SCHEMA extends ArraySchema ? M.$Array<ParseSchema<ARRAY_OR_TUPLE_SCHEMA["items"], OPTIONS>> : ARRAY_OR_TUPLE_SCHEMA extends TupleSchema ? M.$Union<ApplyMinMaxAndAdditionalItems<ParseTupleItems<ARRAY_OR_TUPLE_SCHEMA["items"], OPTIONS>, ARRAY_OR_TUPLE_SCHEMA, OPTIONS>> : M.$Array;
type ParseTupleItems<ITEM_SCHEMAS extends readonly JSONSchema[], OPTIONS extends ParseSchemaOptions> = ITEM_SCHEMAS extends readonly [
    infer ITEM_SCHEMAS_HEAD,
    ...infer ITEM_SCHEMAS_TAIL
] ? ITEM_SCHEMAS_HEAD extends JSONSchema ? ITEM_SCHEMAS_TAIL extends readonly JSONSchema[] ? [
    ParseSchema<ITEM_SCHEMAS_HEAD, OPTIONS>,
    ...ParseTupleItems<ITEM_SCHEMAS_TAIL, OPTIONS>
] : never : never : [];
type ApplyMinMaxAndAdditionalItems<PARSED_ITEM_SCHEMAS extends any[], ROOT_SCHEMA extends ArrayOrTupleSchema, OPTIONS extends ParseSchemaOptions> = ApplyAdditionalItems<ApplyMinMax<PARSED_ITEM_SCHEMAS, ROOT_SCHEMA extends Readonly<{
    minItems: number;
}> ? ROOT_SCHEMA["minItems"] : 0, ROOT_SCHEMA extends Readonly<{
    maxItems: number;
}> ? ROOT_SCHEMA["maxItems"] : undefined>, ROOT_SCHEMA extends Readonly<{
    additionalItems: JSONSchema;
}> ? ROOT_SCHEMA["additionalItems"] : true, OPTIONS>;
type ApplyMinMax<RECURSED_PARSED_ITEM_SCHEMAS extends any[], MIN extends number, MAX extends number | undefined, RESULT = never, HAS_ENCOUNTERED_MIN extends boolean = false, HAS_ENCOUNTERED_MAX extends boolean = false, INITIAL_PARSED_ITEM_SCHEMAS extends any[] = RECURSED_PARSED_ITEM_SCHEMAS> = And<Not<DoesExtend<MIN, RECURSED_PARSED_ITEM_SCHEMAS["length"]>>, DoesExtend<RECURSED_PARSED_ITEM_SCHEMAS, [any, ...any[]]>> extends true ? RECURSED_PARSED_ITEM_SCHEMAS extends [
    ...infer RECURSED_PARSED_ITEM_SCHEMAS_BODY,
    unknown
] ? ApplyMinMax<RECURSED_PARSED_ITEM_SCHEMAS_BODY, MIN, MAX, RECURSED_PARSED_ITEM_SCHEMAS["length"] extends MAX ? M.$Tuple<RECURSED_PARSED_ITEM_SCHEMAS> : RESULT | M.$Tuple<RECURSED_PARSED_ITEM_SCHEMAS>, HAS_ENCOUNTERED_MIN extends true ? true : DoesExtend<MIN, RECURSED_PARSED_ITEM_SCHEMAS["length"]>, HAS_ENCOUNTERED_MAX extends true ? true : DoesExtend<MAX, RECURSED_PARSED_ITEM_SCHEMAS["length"]>, INITIAL_PARSED_ITEM_SCHEMAS> : never : {
    result: MAX extends undefined ? RESULT | M.$Tuple<RECURSED_PARSED_ITEM_SCHEMAS> : HAS_ENCOUNTERED_MAX extends true ? RESULT | M.$Tuple<RECURSED_PARSED_ITEM_SCHEMAS> : MAX extends RECURSED_PARSED_ITEM_SCHEMAS["length"] ? M.$Tuple<RECURSED_PARSED_ITEM_SCHEMAS> : IsLongerThan<Tail<RECURSED_PARSED_ITEM_SCHEMAS>, MAX> extends true ? never : RESULT | M.$Tuple<RECURSED_PARSED_ITEM_SCHEMAS>;
    hasEncounteredMin: DoesExtend<MIN, RECURSED_PARSED_ITEM_SCHEMAS["length"]>;
    hasEncounteredMax: HAS_ENCOUNTERED_MAX extends true ? true : MAX extends RECURSED_PARSED_ITEM_SCHEMAS["length"] ? true : IsLongerThan<Tail<RECURSED_PARSED_ITEM_SCHEMAS>, MAX>;
    completeTuple: INITIAL_PARSED_ITEM_SCHEMAS;
};
type IsLongerThan<TUPLE extends any[], LENGTH extends number | undefined, RESULT extends boolean = false> = LENGTH extends undefined ? false : TUPLE["length"] extends LENGTH ? true : TUPLE extends [any, ...infer TUPLE_TAIL] ? IsLongerThan<TUPLE_TAIL, LENGTH> : RESULT;
type ApplyAdditionalItems<APPLY_MIN_MAX_RESULT extends {
    result: any;
    hasEncounteredMin: boolean;
    hasEncounteredMax: boolean;
    completeTuple: any[];
}, ADDITIONAL_ITEMS_SCHEMA extends JSONSchema, OPTIONS extends ParseSchemaOptions> = APPLY_MIN_MAX_RESULT extends {
    hasEncounteredMax: true;
} ? APPLY_MIN_MAX_RESULT extends {
    hasEncounteredMin: true;
} ? APPLY_MIN_MAX_RESULT["result"] : M.Never : ADDITIONAL_ITEMS_SCHEMA extends false ? APPLY_MIN_MAX_RESULT extends {
    hasEncounteredMin: true;
} ? APPLY_MIN_MAX_RESULT["result"] : M.Never : ADDITIONAL_ITEMS_SCHEMA extends true ? APPLY_MIN_MAX_RESULT extends {
    hasEncounteredMin: true;
} ? APPLY_MIN_MAX_RESULT["result"] | M.$Tuple<APPLY_MIN_MAX_RESULT["completeTuple"], M.Any> : M.$Tuple<APPLY_MIN_MAX_RESULT["completeTuple"], M.Any> : APPLY_MIN_MAX_RESULT extends {
    hasEncounteredMin: true;
} ? APPLY_MIN_MAX_RESULT["result"] | M.$Tuple<APPLY_MIN_MAX_RESULT["completeTuple"], ParseSchema<ADDITIONAL_ITEMS_SCHEMA, OPTIONS>> : M.$Tuple<APPLY_MIN_MAX_RESULT["completeTuple"], ParseSchema<ADDITIONAL_ITEMS_SCHEMA, OPTIONS>>;
export {};
