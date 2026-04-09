import { ZodArrayDef, ZodFirstPartyTypeKind } from 'zod/v3';
import { parseDef } from '../parse-def';
import { JsonSchema7Type } from '../parse-types';
import { Refs } from '../refs';

export type JsonSchema7ArrayType = {
  type: 'array';
  items?: JsonSchema7Type;
  minItems?: number;
  maxItems?: number;
};

export function parseArrayDef(def: ZodArrayDef, refs: Refs) {
  const res: JsonSchema7ArrayType = {
    type: 'array',
  };
  if (
    def.type?._def &&
    def.type?._def?.typeName !== ZodFirstPartyTypeKind.ZodAny
  ) {
    res.items = parseDef(def.type._def, {
      ...refs,
      currentPath: [...refs.currentPath, 'items'],
    });
  }

  if (def.minLength) {
    res.minItems = def.minLength.value;
  }
  if (def.maxLength) {
    res.maxItems = def.maxLength.value;
  }
  if (def.exactLength) {
    res.minItems = def.exactLength.value;
    res.maxItems = def.exactLength.value;
  }
  return res;
}
