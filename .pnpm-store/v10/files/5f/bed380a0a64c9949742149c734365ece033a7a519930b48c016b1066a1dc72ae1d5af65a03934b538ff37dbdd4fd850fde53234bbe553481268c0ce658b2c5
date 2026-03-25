import type { FromSchema, FromSchemaDefaultOptions, FromSchemaOptions, JSONSchema } from "../../index";
export type $Compiler<C extends unknown[] = [], V extends unknown[] = []> = (schema: JSONSchema, ...compilingOptions: C) => (data: unknown, ...validationOptions: V) => boolean;
export type Compiler<O extends FromSchemaOptions = FromSchemaDefaultOptions, C extends unknown[] = [], V extends unknown[] = []> = <S extends JSONSchema, T = FromSchema<S, O>>(schema: S, ...compilingOptions: C) => (data: unknown, ...validationOptions: V) => data is T;
type CompilerWrapper = <O extends FromSchemaOptions = FromSchemaDefaultOptions, C extends unknown[] = [], V extends unknown[] = []>(compiler: $Compiler<C, V>) => Compiler<O, C, V>;
export declare const wrapCompilerAsTypeGuard: CompilerWrapper;
export {};
