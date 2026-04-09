import { JsonSchema7AnyType, parseAnyDef } from './any';

export type JsonSchema7NeverType = {
  not: JsonSchema7AnyType;
};

export function parseNeverDef(): JsonSchema7NeverType | undefined {
  return { not: parseAnyDef() };
}
