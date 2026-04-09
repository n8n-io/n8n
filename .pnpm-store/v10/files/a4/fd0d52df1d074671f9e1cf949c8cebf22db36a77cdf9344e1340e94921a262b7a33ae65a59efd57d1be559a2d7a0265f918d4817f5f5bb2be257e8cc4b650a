import { ZodFirstPartyTypeKind } from 'zod/v3';
import { parseAnyDef } from './parsers/any';
import { parseArrayDef } from './parsers/array';
import { parseBigintDef } from './parsers/bigint';
import { parseBooleanDef } from './parsers/boolean';
import { parseBrandedDef } from './parsers/branded';
import { parseCatchDef } from './parsers/catch';
import { parseDateDef } from './parsers/date';
import { parseDefaultDef } from './parsers/default';
import { parseEffectsDef } from './parsers/effects';
import { parseEnumDef } from './parsers/enum';
import { parseIntersectionDef } from './parsers/intersection';
import { parseLiteralDef } from './parsers/literal';
import { parseMapDef } from './parsers/map';
import { parseNativeEnumDef } from './parsers/native-enum';
import { parseNeverDef } from './parsers/never';
import { parseNullDef } from './parsers/null';
import { parseNullableDef } from './parsers/nullable';
import { parseNumberDef } from './parsers/number';
import { parseObjectDef } from './parsers/object';
import { parseOptionalDef } from './parsers/optional';
import { parsePipelineDef } from './parsers/pipeline';
import { parsePromiseDef } from './parsers/promise';
import { parseRecordDef } from './parsers/record';
import { parseSetDef } from './parsers/set';
import { parseStringDef } from './parsers/string';
import { parseTupleDef } from './parsers/tuple';
import { parseUndefinedDef } from './parsers/undefined';
import { parseUnionDef } from './parsers/union';
import { parseUnknownDef } from './parsers/unknown';
import { Refs } from './refs';
import { parseReadonlyDef } from './parsers/readonly';
import { JsonSchema7Type } from './parse-types';

export type InnerDefGetter = () => any;

export const selectParser = (
  def: any,
  typeName: ZodFirstPartyTypeKind,
  refs: Refs,
): JsonSchema7Type | undefined | InnerDefGetter => {
  switch (typeName) {
    case ZodFirstPartyTypeKind.ZodString:
      return parseStringDef(def, refs);
    case ZodFirstPartyTypeKind.ZodNumber:
      return parseNumberDef(def);
    case ZodFirstPartyTypeKind.ZodObject:
      return parseObjectDef(def, refs);
    case ZodFirstPartyTypeKind.ZodBigInt:
      return parseBigintDef(def);
    case ZodFirstPartyTypeKind.ZodBoolean:
      return parseBooleanDef();
    case ZodFirstPartyTypeKind.ZodDate:
      return parseDateDef(def, refs);
    case ZodFirstPartyTypeKind.ZodUndefined:
      return parseUndefinedDef();
    case ZodFirstPartyTypeKind.ZodNull:
      return parseNullDef();
    case ZodFirstPartyTypeKind.ZodArray:
      return parseArrayDef(def, refs);
    case ZodFirstPartyTypeKind.ZodUnion:
    case ZodFirstPartyTypeKind.ZodDiscriminatedUnion:
      return parseUnionDef(def, refs);
    case ZodFirstPartyTypeKind.ZodIntersection:
      return parseIntersectionDef(def, refs);
    case ZodFirstPartyTypeKind.ZodTuple:
      return parseTupleDef(def, refs);
    case ZodFirstPartyTypeKind.ZodRecord:
      return parseRecordDef(def, refs);
    case ZodFirstPartyTypeKind.ZodLiteral:
      return parseLiteralDef(def);
    case ZodFirstPartyTypeKind.ZodEnum:
      return parseEnumDef(def);
    case ZodFirstPartyTypeKind.ZodNativeEnum:
      return parseNativeEnumDef(def);
    case ZodFirstPartyTypeKind.ZodNullable:
      return parseNullableDef(def, refs);
    case ZodFirstPartyTypeKind.ZodOptional:
      return parseOptionalDef(def, refs);
    case ZodFirstPartyTypeKind.ZodMap:
      return parseMapDef(def, refs);
    case ZodFirstPartyTypeKind.ZodSet:
      return parseSetDef(def, refs);
    case ZodFirstPartyTypeKind.ZodLazy:
      return () => (def as any).getter()._def;
    case ZodFirstPartyTypeKind.ZodPromise:
      return parsePromiseDef(def, refs);
    case ZodFirstPartyTypeKind.ZodNaN:
    case ZodFirstPartyTypeKind.ZodNever:
      return parseNeverDef();
    case ZodFirstPartyTypeKind.ZodEffects:
      return parseEffectsDef(def, refs);
    case ZodFirstPartyTypeKind.ZodAny:
      return parseAnyDef();
    case ZodFirstPartyTypeKind.ZodUnknown:
      return parseUnknownDef();
    case ZodFirstPartyTypeKind.ZodDefault:
      return parseDefaultDef(def, refs);
    case ZodFirstPartyTypeKind.ZodBranded:
      return parseBrandedDef(def, refs);
    case ZodFirstPartyTypeKind.ZodReadonly:
      return parseReadonlyDef(def, refs);
    case ZodFirstPartyTypeKind.ZodCatch:
      return parseCatchDef(def, refs);
    case ZodFirstPartyTypeKind.ZodPipeline:
      return parsePipelineDef(def, refs);
    case ZodFirstPartyTypeKind.ZodFunction:
    case ZodFirstPartyTypeKind.ZodVoid:
    case ZodFirstPartyTypeKind.ZodSymbol:
      return undefined;
    default:
      /* c8 ignore next */
      return ((_: never) => undefined)(typeName);
  }
};
