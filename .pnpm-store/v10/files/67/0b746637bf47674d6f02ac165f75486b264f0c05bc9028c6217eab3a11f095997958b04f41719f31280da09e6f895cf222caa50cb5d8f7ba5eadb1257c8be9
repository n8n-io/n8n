import type { M } from "ts-algebra";
import type { ExtendedJSONSchema, FromExtendedSchemaOptions, FromSchemaDefaultOptions, FromSchemaOptions, JSONSchema, JSONSchemaExtension, UnextendJSONSchema } from "./definitions";
import type { ParseOptions } from "./parse-options";
import type { ParseSchema } from "./parse-schema";
export type { ExtendedJSONSchema, DeserializationPattern, FromSchemaOptions, FromExtendedSchemaOptions, FromSchemaDefaultOptions, JSONSchemaExtension, JSONSchema, } from "./definitions";
export type { $Compiler, Compiler, $Validator, Validator } from "./utils";
export { wrapCompilerAsTypeGuard, wrapValidatorAsTypeGuard, asConst, } from "./utils";
export type FromSchema<SCHEMA extends JSONSchema, OPTIONS extends FromSchemaOptions = FromSchemaDefaultOptions> = M.$Resolve<ParseSchema<SCHEMA, ParseOptions<SCHEMA, OPTIONS>>>;
export type FromExtendedSchema<EXTENSION extends JSONSchemaExtension, SCHEMA extends ExtendedJSONSchema<EXTENSION>, OPTIONS extends FromExtendedSchemaOptions<EXTENSION> = FromSchemaDefaultOptions, UNEXTENDED_SCHEMA = UnextendJSONSchema<EXTENSION, SCHEMA>> = UNEXTENDED_SCHEMA extends JSONSchema ? FromSchema<UNEXTENDED_SCHEMA, OPTIONS> : never;
