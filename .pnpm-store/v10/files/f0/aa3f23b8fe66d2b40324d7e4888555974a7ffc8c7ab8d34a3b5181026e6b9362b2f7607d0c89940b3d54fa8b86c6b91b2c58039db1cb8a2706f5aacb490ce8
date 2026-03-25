import type { ErrorObject, Vocabulary } from "ajv/dist/core";
import { LimitNumberError } from "./limitNumber";
import { MultipleOfError } from "ajv/dist/vocabularies/validation/multipleOf";
import { PatternError } from "ajv/dist/vocabularies/validation/pattern";
import { RequiredError } from "ajv/dist/vocabularies/validation/required";
import { UniqueItemsError } from "ajv/dist/vocabularies/validation/uniqueItems";
import { ConstError } from "ajv/dist/vocabularies/validation/const";
import { EnumError } from "ajv/dist/vocabularies/validation/enum";
declare const validation: Vocabulary;
export default validation;
declare type LimitError = ErrorObject<"maxItems" | "minItems" | "minProperties" | "maxProperties" | "minLength" | "maxLength", {
    limit: number;
}, number | {
    $data: string;
}>;
export declare type ValidationKeywordError = LimitError | LimitNumberError | MultipleOfError | PatternError | RequiredError | UniqueItemsError | ConstError | EnumError;
