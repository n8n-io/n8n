import { ZodBrandedDef } from 'zod/v3';
import { parseDef } from '../parse-def';
import { Refs } from '../refs';

export function parseBrandedDef(_def: ZodBrandedDef<any>, refs: Refs) {
  return parseDef(_def.type._def, refs);
}
