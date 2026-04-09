import { ZodDefaultDef } from 'zod/v3';
import { parseDef } from '../parse-def';
import { JsonSchema7Type } from '../parse-types';
import { Refs } from '../refs';

export function parseDefaultDef(
  _def: ZodDefaultDef,
  refs: Refs,
): JsonSchema7Type & { default: any } {
  return {
    ...parseDef(_def.innerType._def, refs),
    default: _def.defaultValue(),
  };
}
