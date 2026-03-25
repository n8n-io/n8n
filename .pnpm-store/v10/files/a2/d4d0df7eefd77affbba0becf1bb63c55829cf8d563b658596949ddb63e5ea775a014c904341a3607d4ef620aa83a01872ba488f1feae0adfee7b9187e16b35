import { Schema, SchemaDraft, ValidationResult } from './types.js';
export type Evaluated = Record<string | number, boolean>;
export declare function validate(
  instance: any,
  schema: Schema | boolean,
  draft?: SchemaDraft,
  lookup?: Record<string, Schema | boolean>,
  shortCircuit?: boolean,
  recursiveAnchor?: Schema | null,
  instanceLocation?: string,
  schemaLocation?: string,
  evaluated?: Evaluated
): ValidationResult;
