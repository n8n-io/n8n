import type {ErrorObject, Vocabulary} from "ajv/dist/core"
import limitNumber, {LimitNumberError} from "./limitNumber"
import limitNumberExclusive from "./limitNumberExclusive"
import multipleOf, {MultipleOfError} from "ajv/dist/vocabularies/validation/multipleOf"
import limitLength from "ajv/dist/vocabularies/validation/limitLength"
import pattern, {PatternError} from "ajv/dist/vocabularies/validation/pattern"
import limitProperties from "ajv/dist/vocabularies/validation/limitProperties"
import required, {RequiredError} from "ajv/dist/vocabularies/validation/required"
import limitItems from "ajv/dist/vocabularies/validation/limitItems"
import uniqueItems, {UniqueItemsError} from "ajv/dist/vocabularies/validation/uniqueItems"
import constKeyword, {ConstError} from "ajv/dist/vocabularies/validation/const"
import enumKeyword, {EnumError} from "ajv/dist/vocabularies/validation/enum"

const validation: Vocabulary = [
  // number
  limitNumber,
  limitNumberExclusive,
  multipleOf,
  // string
  limitLength,
  pattern,
  // object
  limitProperties,
  required,
  // array
  limitItems,
  uniqueItems,
  // any
  {keyword: "type", schemaType: ["string", "array"]},
  {keyword: "nullable", schemaType: "boolean"},
  constKeyword,
  enumKeyword,
]

export default validation

type LimitError = ErrorObject<
  "maxItems" | "minItems" | "minProperties" | "maxProperties" | "minLength" | "maxLength",
  {limit: number},
  number | {$data: string}
>

export type ValidationKeywordError =
  | LimitError
  | LimitNumberError
  | MultipleOfError
  | PatternError
  | RequiredError
  | UniqueItemsError
  | ConstError
  | EnumError
