import { ZodCatchDef } from 'zod/v3';
import { parseDef } from '../parse-def';
import { Refs } from '../refs';

export const parseCatchDef = (def: ZodCatchDef<any>, refs: Refs) => {
  return parseDef(def.innerType._def, refs);
};
