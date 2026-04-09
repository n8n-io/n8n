import { ZodOptionalDef } from 'zod/v3';
import { parseDef } from '../parse-def';
import { JsonSchema7Type } from '../parse-types';
import { Refs } from '../refs';
import { parseAnyDef } from './any';

export const parseOptionalDef = (
  def: ZodOptionalDef,
  refs: Refs,
): JsonSchema7Type | undefined => {
  if (refs.currentPath.toString() === refs.propertyPath?.toString()) {
    return parseDef(def.innerType._def, refs);
  }

  const innerSchema = parseDef(def.innerType._def, {
    ...refs,
    currentPath: [...refs.currentPath, 'anyOf', '1'],
  });

  return innerSchema
    ? { anyOf: [{ not: parseAnyDef() }, innerSchema] }
    : parseAnyDef();
};
