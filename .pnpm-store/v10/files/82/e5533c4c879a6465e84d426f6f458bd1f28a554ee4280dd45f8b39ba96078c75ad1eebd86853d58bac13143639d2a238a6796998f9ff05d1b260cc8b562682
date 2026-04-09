import { ZodEffectsDef } from 'zod/v3';
import { parseDef } from '../parse-def';
import { JsonSchema7Type } from '../parse-types';
import { Refs } from '../refs';
import { parseAnyDef } from './any';

export function parseEffectsDef(
  _def: ZodEffectsDef,
  refs: Refs,
): JsonSchema7Type | undefined {
  return refs.effectStrategy === 'input'
    ? parseDef(_def.schema._def, refs)
    : parseAnyDef();
}
