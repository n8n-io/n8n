require("../../_virtual/_rolldown/runtime.cjs");
const require_any = require("./parsers/any.cjs");
const require_array = require("./parsers/array.cjs");
const require_bigint = require("./parsers/bigint.cjs");
const require_boolean = require("./parsers/boolean.cjs");
const require_branded = require("./parsers/branded.cjs");
const require_catch = require("./parsers/catch.cjs");
const require_date = require("./parsers/date.cjs");
const require_default = require("./parsers/default.cjs");
const require_effects = require("./parsers/effects.cjs");
const require_enum = require("./parsers/enum.cjs");
const require_intersection = require("./parsers/intersection.cjs");
const require_literal = require("./parsers/literal.cjs");
const require_string = require("./parsers/string.cjs");
const require_record = require("./parsers/record.cjs");
const require_map = require("./parsers/map.cjs");
const require_nativeEnum = require("./parsers/nativeEnum.cjs");
const require_never = require("./parsers/never.cjs");
const require_null = require("./parsers/null.cjs");
const require_union = require("./parsers/union.cjs");
const require_nullable = require("./parsers/nullable.cjs");
const require_number = require("./parsers/number.cjs");
const require_object = require("./parsers/object.cjs");
const require_optional = require("./parsers/optional.cjs");
const require_pipeline = require("./parsers/pipeline.cjs");
const require_promise = require("./parsers/promise.cjs");
const require_set = require("./parsers/set.cjs");
const require_tuple = require("./parsers/tuple.cjs");
const require_undefined = require("./parsers/undefined.cjs");
const require_unknown = require("./parsers/unknown.cjs");
const require_readonly = require("./parsers/readonly.cjs");
let zod_v3 = require("zod/v3");
//#region src/utils/zod-to-json-schema/selectParser.ts
const selectParser = (def, typeName, refs) => {
	switch (typeName) {
		case zod_v3.ZodFirstPartyTypeKind.ZodString: return require_string.parseStringDef(def, refs);
		case zod_v3.ZodFirstPartyTypeKind.ZodNumber: return require_number.parseNumberDef(def, refs);
		case zod_v3.ZodFirstPartyTypeKind.ZodObject: return require_object.parseObjectDef(def, refs);
		case zod_v3.ZodFirstPartyTypeKind.ZodBigInt: return require_bigint.parseBigintDef(def, refs);
		case zod_v3.ZodFirstPartyTypeKind.ZodBoolean: return require_boolean.parseBooleanDef();
		case zod_v3.ZodFirstPartyTypeKind.ZodDate: return require_date.parseDateDef(def, refs);
		case zod_v3.ZodFirstPartyTypeKind.ZodUndefined: return require_undefined.parseUndefinedDef(refs);
		case zod_v3.ZodFirstPartyTypeKind.ZodNull: return require_null.parseNullDef(refs);
		case zod_v3.ZodFirstPartyTypeKind.ZodArray: return require_array.parseArrayDef(def, refs);
		case zod_v3.ZodFirstPartyTypeKind.ZodUnion:
		case zod_v3.ZodFirstPartyTypeKind.ZodDiscriminatedUnion: return require_union.parseUnionDef(def, refs);
		case zod_v3.ZodFirstPartyTypeKind.ZodIntersection: return require_intersection.parseIntersectionDef(def, refs);
		case zod_v3.ZodFirstPartyTypeKind.ZodTuple: return require_tuple.parseTupleDef(def, refs);
		case zod_v3.ZodFirstPartyTypeKind.ZodRecord: return require_record.parseRecordDef(def, refs);
		case zod_v3.ZodFirstPartyTypeKind.ZodLiteral: return require_literal.parseLiteralDef(def, refs);
		case zod_v3.ZodFirstPartyTypeKind.ZodEnum: return require_enum.parseEnumDef(def);
		case zod_v3.ZodFirstPartyTypeKind.ZodNativeEnum: return require_nativeEnum.parseNativeEnumDef(def);
		case zod_v3.ZodFirstPartyTypeKind.ZodNullable: return require_nullable.parseNullableDef(def, refs);
		case zod_v3.ZodFirstPartyTypeKind.ZodOptional: return require_optional.parseOptionalDef(def, refs);
		case zod_v3.ZodFirstPartyTypeKind.ZodMap: return require_map.parseMapDef(def, refs);
		case zod_v3.ZodFirstPartyTypeKind.ZodSet: return require_set.parseSetDef(def, refs);
		case zod_v3.ZodFirstPartyTypeKind.ZodLazy: return () => def.getter()._def;
		case zod_v3.ZodFirstPartyTypeKind.ZodPromise: return require_promise.parsePromiseDef(def, refs);
		case zod_v3.ZodFirstPartyTypeKind.ZodNaN:
		case zod_v3.ZodFirstPartyTypeKind.ZodNever: return require_never.parseNeverDef(refs);
		case zod_v3.ZodFirstPartyTypeKind.ZodEffects: return require_effects.parseEffectsDef(def, refs);
		case zod_v3.ZodFirstPartyTypeKind.ZodAny: return require_any.parseAnyDef(refs);
		case zod_v3.ZodFirstPartyTypeKind.ZodUnknown: return require_unknown.parseUnknownDef(refs);
		case zod_v3.ZodFirstPartyTypeKind.ZodDefault: return require_default.parseDefaultDef(def, refs);
		case zod_v3.ZodFirstPartyTypeKind.ZodBranded: return require_branded.parseBrandedDef(def, refs);
		case zod_v3.ZodFirstPartyTypeKind.ZodReadonly: return require_readonly.parseReadonlyDef(def, refs);
		case zod_v3.ZodFirstPartyTypeKind.ZodCatch: return require_catch.parseCatchDef(def, refs);
		case zod_v3.ZodFirstPartyTypeKind.ZodPipeline: return require_pipeline.parsePipelineDef(def, refs);
		case zod_v3.ZodFirstPartyTypeKind.ZodFunction:
		case zod_v3.ZodFirstPartyTypeKind.ZodVoid:
		case zod_v3.ZodFirstPartyTypeKind.ZodSymbol: return;
		default:
 /* c8 ignore next */
		return ((_) => void 0)(typeName);
	}
};
//#endregion
exports.selectParser = selectParser;

//# sourceMappingURL=selectParser.cjs.map