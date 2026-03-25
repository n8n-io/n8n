// These typings are experimental and known to be incomplete.
// Help wanted at https://github.com/ExodusMovement/schemasafe/issues/130

type Json = string | number | boolean | null | Array<Json> | { [id: string]: Json }

type Schema =
  | true
  | false
  | {
      // version
      $schema?: string
      $vocabulary?: string
      // pointers
      id?: string
      $id?: string
      $anchor?: string
      $ref?: string
      definitions?: { [id: string]: Schema }
      $defs?: { [id: string]: Schema }
      $recursiveRef?: string
      $recursiveAnchor?: boolean
      // generic
      type?: string | Array<string>
      required?: Array<string>
      default?: Json
      // constant values
      enum?: Array<Json>
      const?: Json
      // logical checks
      not?: Schema
      allOf?: Array<Schema>
      anyOf?: Array<Schema>
      oneOf?: Array<Schema>
      if?: Schema
      then?: Schema
      else?: Schema
      // numbers
      maximum?: number
      minimum?: number
      exclusiveMaximum?: number | boolean
      exclusiveMinimum?: number | boolean
      multipleOf?: number
      divisibleBy?: number
      // arrays, basic
      items?: Schema | Array<Schema>
      maxItems?: number
      minItems?: number
      additionalItems?: Schema
      // arrays, complex
      contains?: Schema
      minContains?: number
      maxContains?: number
      uniqueItems?: boolean
      // strings
      maxLength?: number
      minLength?: number
      format?: string
      pattern?: string
      // strings content
      contentEncoding?: string
      contentMediaType?: string
      contentSchema?: Schema
      // objects
      properties?: { [id: string]: Schema }
      maxProperties?: number
      minProperties?: number
      additionalProperties?: Schema
      patternProperties?: { [pattern: string]: Schema }
      propertyNames?: Schema
      dependencies?: { [id: string]: Array<string> | Schema }
      dependentRequired?: { [id: string]: Array<string> }
      dependentSchemas?: { [id: string]: Schema }
      // see-through
      unevaluatedProperties?: Schema
      unevaluatedItems?: Schema
      // Unused meta keywords not affecting validation (annotations and comments)
      // https://json-schema.org/understanding-json-schema/reference/generic.html
      // https://json-schema.org/draft/2019-09/json-schema-validation.html#rfc.section.9
      title?: string
      description?: string
      deprecated?: boolean
      readOnly?: boolean
      writeOnly?: boolean
      examples?: Array<Json>
      $comment?: string
      // optimization hint and error filtering only, does not affect validation result
      discriminator?: { propertyName: string; mapping?: { [value: string]: string } }
    }

interface ValidationError {
  keywordLocation: string
  instanceLocation: string
}

interface Validate {
  (value: Json): boolean
  errors?: ValidationError[]
  toModule(): string
  toJSON(): Schema
}

interface ValidatorOptions {
  mode?: string
  useDefaults?: boolean
  removeAdditional?: boolean | string
  includeErrors?: boolean
  allErrors?: boolean
  contentValidation?: boolean
  dryRun?: boolean
  lint?: boolean
  allowUnusedKeywords?: boolean
  allowUnreachable?: boolean
  requireSchema?: boolean
  requireValidation?: boolean
  requireStringValidation?: boolean
  forbidNoopValues?: boolean
  complexityChecks?: boolean
  unmodifiedPrototypes?: boolean
  isJSON?: boolean
  jsonCheck?: boolean
  $schemaDefault?: string | null
  formatAssertion?: boolean
  formats?: { [key: string]: RegExp | ((input: string) => boolean) }
  weakFormats?: boolean
  extraFormats?: boolean
  schemas?: Map<string, Schema> | Array<Schema> | { [id: string]: Schema }
}

interface ParseResult {
  valid: boolean
  value?: Json
  error?: string
  errors?: ValidationError[]
}

interface Parse {
  (value: string): ParseResult
  toModule(): string
  toJSON(): Schema
}

interface LintError {
  message: string
  keywordLocation: string
  schema: Schema
}

declare const validator: (schema: Schema, options?: ValidatorOptions) => Validate

declare const parser: (schema: Schema, options?: ValidatorOptions) => Parse

declare const lint: (schema: Schema, options?: ValidatorOptions) => LintError[]

export {
  validator,
  parser,
  lint,
  Validate,
  ValidationError,
  ValidatorOptions,
  ParseResult,
  Parse,
  LintError,
  Json,
  Schema,
}
