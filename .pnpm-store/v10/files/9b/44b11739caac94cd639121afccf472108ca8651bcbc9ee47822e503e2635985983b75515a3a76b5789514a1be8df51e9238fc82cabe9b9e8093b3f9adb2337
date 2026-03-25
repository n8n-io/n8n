export type SchemaDraft = '4' | '7' | '2019-09' | '2020-12';

export const enum OutputFormat {
  Flag = 1 << 0,
  Basic = 1 << 1,
  Detailed = 1 << 2
}

export type InstanceType =
  | 'array'
  | 'boolean'
  | 'integer'
  | 'null'
  | 'number'
  | 'object'
  | 'string';

export interface Schema {
  $id?: string;
  $anchor?: string;
  $recursiveAnchor?: boolean;
  $ref?: string;
  $recursiveRef?: '#';
  $schema?: string;
  $comment?: string;
  $defs?: any;
  $vocabulary?: Record<string, boolean>;

  type?: InstanceType | InstanceType[];
  const?: any;
  enum?: any[];
  required?: string[];
  not?: Schema;
  anyOf?: Schema[];
  allOf?: Schema[];
  oneOf?: Schema[];
  if?: Schema;
  then?: Schema;
  else?: Schema;

  format?: string;

  properties?: Record<string | number, Schema | boolean>;
  patternProperties?: Record<string, Schema | boolean>;
  additionalProperties?: Schema | boolean;
  unevaluatedProperties?: Schema | boolean;
  minProperties?: number;
  maxProperties?: number;
  propertyNames?: Schema;
  dependentRequired?: Record<string, string[]>;
  dependentSchemas?: Record<string, Schema>;
  dependencies?: Record<string, Schema | string[]>;

  prefixItems?: Array<Schema | boolean>;
  items?: Schema | boolean | Array<Schema | boolean>;
  additionalItems?: Schema | boolean;
  unevaluatedItems?: Schema | boolean;
  contains?: Schema | boolean;
  minContains?: number;
  maxContains?: number;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;

  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number | boolean;
  exclusiveMaximum?: number | boolean;
  multipleOf?: number;

  minLength?: number;
  maxLength?: number;
  pattern?: string;

  __absolute_ref__?: string;
  __absolute_recursive_ref__?: string;
  __absolute_uri__?: string;

  [key: string]: any;
}

export interface OutputUnit {
  keyword: string;
  keywordLocation: string;
  instanceLocation: string;
  error: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: OutputUnit[];
}
