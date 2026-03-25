import type { CodeKeywordDefinition, ErrorObject } from "ajv/dist/core";
export declare type LimitKwd = "maximum" | "minimum";
export declare type ExclusiveLimitKwd = "exclusiveMaximum" | "exclusiveMinimum";
declare type Comparison = "<=" | ">=" | "<" | ">";
export declare type LimitNumberError = ErrorObject<LimitKwd, {
    limit: number;
    comparison: Comparison;
}, number | {
    $data: string;
}>;
declare const def: CodeKeywordDefinition;
export default def;
