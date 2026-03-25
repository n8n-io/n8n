import { JsonSchema7AnyType } from "./parsers/any.cjs";
import { JsonSchema7ArrayType } from "./parsers/array.cjs";
import { JsonSchema7BigintType } from "./parsers/bigint.cjs";
import { JsonSchema7BooleanType } from "./parsers/boolean.cjs";
import { JsonSchema7NumberType } from "./parsers/number.cjs";
import { JsonSchema7DateType } from "./parsers/date.cjs";
import { JsonSchema7EnumType } from "./parsers/enum.cjs";
import { JsonSchema7AllOfType } from "./parsers/intersection.cjs";
import { JsonSchema7LiteralType } from "./parsers/literal.cjs";
import { JsonSchema7StringType } from "./parsers/string.cjs";
import { JsonSchema7RecordType } from "./parsers/record.cjs";
import { JsonSchema7MapType } from "./parsers/map.cjs";
import { JsonSchema7NativeEnumType } from "./parsers/nativeEnum.cjs";
import { JsonSchema7NeverType } from "./parsers/never.cjs";
import { JsonSchema7NullType } from "./parsers/null.cjs";
import { JsonSchema7NullableType } from "./parsers/nullable.cjs";
import { JsonSchema7ObjectType } from "./parsers/object.cjs";
import { JsonSchema7SetType } from "./parsers/set.cjs";
import { JsonSchema7TupleType } from "./parsers/tuple.cjs";
import { JsonSchema7UndefinedType } from "./parsers/undefined.cjs";
import { JsonSchema7UnionType } from "./parsers/union.cjs";
import { JsonSchema7UnknownType } from "./parsers/unknown.cjs";

//#region src/utils/zod-to-json-schema/parseTypes.d.ts
type JsonSchema7RefType = {
  $ref: string;
};
type JsonSchema7Meta = {
  title?: string;
  default?: any;
  description?: string;
  markdownDescription?: string;
};
type JsonSchema7TypeUnion = JsonSchema7StringType | JsonSchema7ArrayType | JsonSchema7NumberType | JsonSchema7BigintType | JsonSchema7BooleanType | JsonSchema7DateType | JsonSchema7EnumType | JsonSchema7LiteralType | JsonSchema7NativeEnumType | JsonSchema7NullType | JsonSchema7NumberType | JsonSchema7ObjectType | JsonSchema7RecordType | JsonSchema7TupleType | JsonSchema7UnionType | JsonSchema7UndefinedType | JsonSchema7RefType | JsonSchema7NeverType | JsonSchema7MapType | JsonSchema7AnyType | JsonSchema7NullableType | JsonSchema7AllOfType | JsonSchema7UnknownType | JsonSchema7SetType;
type JsonSchema7Type = JsonSchema7TypeUnion & JsonSchema7Meta;
//#endregion
export { JsonSchema7Type, JsonSchema7TypeUnion };
//# sourceMappingURL=parseTypes.d.cts.map