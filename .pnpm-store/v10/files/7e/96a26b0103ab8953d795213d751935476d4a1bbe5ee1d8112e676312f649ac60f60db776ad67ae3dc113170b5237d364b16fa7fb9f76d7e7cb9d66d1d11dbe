import { JsonSchema7AnyType } from './parsers/any';
import { JsonSchema7ArrayType } from './parsers/array';
import { JsonSchema7BigintType } from './parsers/bigint';
import { JsonSchema7BooleanType } from './parsers/boolean';
import { JsonSchema7DateType } from './parsers/date';
import { JsonSchema7EnumType } from './parsers/enum';
import { JsonSchema7AllOfType } from './parsers/intersection';
import { JsonSchema7LiteralType } from './parsers/literal';
import { JsonSchema7MapType } from './parsers/map';
import { JsonSchema7NativeEnumType } from './parsers/native-enum';
import { JsonSchema7NeverType } from './parsers/never';
import { JsonSchema7NullType } from './parsers/null';
import { JsonSchema7NullableType } from './parsers/nullable';
import { JsonSchema7NumberType } from './parsers/number';
import { JsonSchema7ObjectType } from './parsers/object';
import { JsonSchema7RecordType } from './parsers/record';
import { JsonSchema7SetType } from './parsers/set';
import { JsonSchema7StringType } from './parsers/string';
import { JsonSchema7TupleType } from './parsers/tuple';
import { JsonSchema7UndefinedType } from './parsers/undefined';
import { JsonSchema7UnionType } from './parsers/union';
import { JsonSchema7UnknownType } from './parsers/unknown';

type JsonSchema7RefType = { $ref: string };
type JsonSchema7Meta = {
  title?: string;
  default?: any;
  description?: string;
};

export type JsonSchema7TypeUnion =
  | JsonSchema7StringType
  | JsonSchema7ArrayType
  | JsonSchema7NumberType
  | JsonSchema7BigintType
  | JsonSchema7BooleanType
  | JsonSchema7DateType
  | JsonSchema7EnumType
  | JsonSchema7LiteralType
  | JsonSchema7NativeEnumType
  | JsonSchema7NullType
  | JsonSchema7NumberType
  | JsonSchema7ObjectType
  | JsonSchema7RecordType
  | JsonSchema7TupleType
  | JsonSchema7UnionType
  | JsonSchema7UndefinedType
  | JsonSchema7RefType
  | JsonSchema7NeverType
  | JsonSchema7MapType
  | JsonSchema7AnyType
  | JsonSchema7NullableType
  | JsonSchema7AllOfType
  | JsonSchema7UnknownType
  | JsonSchema7SetType;

export type JsonSchema7Type = JsonSchema7TypeUnion & JsonSchema7Meta;
