import {
  ZodFirstPartyTypeKind,
  ZodMapDef,
  ZodRecordDef,
  ZodTypeAny,
} from 'zod/v3';
import { parseDef } from '../parse-def';
import { JsonSchema7Type } from '../parse-types';
import { Refs } from '../refs';
import { parseBrandedDef } from './branded';
import { JsonSchema7EnumType } from './enum';
import { JsonSchema7StringType, parseStringDef } from './string';

type JsonSchema7RecordPropertyNamesType =
  | Omit<JsonSchema7StringType, 'type'>
  | Omit<JsonSchema7EnumType, 'type'>;

export type JsonSchema7RecordType = {
  type: 'object';
  additionalProperties?: JsonSchema7Type | true;
  propertyNames?: JsonSchema7RecordPropertyNamesType;
};

export function parseRecordDef(
  def: ZodRecordDef<ZodTypeAny, ZodTypeAny> | ZodMapDef,
  refs: Refs,
): JsonSchema7RecordType {
  const schema: JsonSchema7RecordType = {
    type: 'object',
    additionalProperties:
      parseDef(def.valueType._def, {
        ...refs,
        currentPath: [...refs.currentPath, 'additionalProperties'],
      }) ?? refs.allowedAdditionalProperties,
  };

  if (
    def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodString &&
    def.keyType._def.checks?.length
  ) {
    const { type, ...keyType } = parseStringDef(def.keyType._def, refs);

    return {
      ...schema,
      propertyNames: keyType,
    };
  } else if (def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodEnum) {
    return {
      ...schema,
      propertyNames: {
        enum: def.keyType._def.values,
      },
    };
  } else if (
    def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodBranded &&
    def.keyType._def.type._def.typeName === ZodFirstPartyTypeKind.ZodString &&
    def.keyType._def.type._def.checks?.length
  ) {
    const { type, ...keyType } = parseBrandedDef(
      def.keyType._def,
      refs,
    ) as JsonSchema7StringType;

    return {
      ...schema,
      propertyNames: keyType,
    };
  }

  return schema;
}
