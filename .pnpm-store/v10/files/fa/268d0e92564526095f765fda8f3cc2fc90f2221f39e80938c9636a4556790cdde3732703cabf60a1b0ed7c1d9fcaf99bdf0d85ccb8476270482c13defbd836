import { JsonSchema7Type } from "../parseTypes.cjs";

//#region src/utils/zod-to-json-schema/parsers/union.d.ts
declare const primitiveMappings: {
  readonly ZodString: "string";
  readonly ZodNumber: "number";
  readonly ZodBigInt: "integer";
  readonly ZodBoolean: "boolean";
  readonly ZodNull: "null";
};
type JsonSchema7Primitive = (typeof primitiveMappings)[keyof typeof primitiveMappings];
type JsonSchema7UnionType = JsonSchema7PrimitiveUnionType | JsonSchema7AnyOfType;
type JsonSchema7PrimitiveUnionType = {
  type: JsonSchema7Primitive | JsonSchema7Primitive[];
} | {
  type: JsonSchema7Primitive | JsonSchema7Primitive[];
  enum: (string | number | bigint | boolean | null)[];
};
type JsonSchema7AnyOfType = {
  anyOf: JsonSchema7Type[];
};
//#endregion
export { JsonSchema7UnionType };
//# sourceMappingURL=union.d.cts.map