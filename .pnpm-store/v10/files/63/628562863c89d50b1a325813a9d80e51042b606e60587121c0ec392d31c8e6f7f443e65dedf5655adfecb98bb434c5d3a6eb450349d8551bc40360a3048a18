// common fields for OAS descriptions v3.x
interface Oas3DefinitionBase<T extends Oas3Schema | Oas3_1Schema> {
  openapi: string;
  info?: Oas3Info;
  servers?: Oas3Server[];
  paths?: Oas3Paths<T>;
  components?: T extends Oas3_1Schema ? Oas3_1Components : Oas3Components;
  security?: Oas3SecurityRequirement[];
  tags?: Oas3Tag[];
  externalDocs?: Oas3ExternalDocs;
}

export interface Oas3Definition extends Oas3DefinitionBase<Oas3Schema> {
  'x-webhooks'?: Oas3Webhooks<Oas3Schema>;
}

export interface Oas3_1Definition extends Oas3DefinitionBase<Oas3_1Schema> {
  webhooks?: Oas3Webhooks<Oas3_1Schema>;
}

export interface Oas3Info {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: Oas3Contact;
  license?: Oas3License;
}

export interface Oas3Server {
  url: string;
  description?: string;
  variables?: { [name: string]: Oas3ServerVariable };
}

export interface Oas3ServerVariable {
  enum?: string[];
  default: string;
  description?: string;
}

export interface Oas3Paths<T extends Oas3Schema | Oas3_1Schema = Oas3Schema | Oas3_1Schema> {
  [path: string]: Referenced<Oas3PathItem<T>>;
}
export interface OasRef {
  $ref: string;
}

export type Referenced<T> = OasRef | T;

export interface Oas3PathItem<T extends Oas3Schema | Oas3_1Schema = Oas3Schema | Oas3_1Schema> {
  summary?: string;
  description?: string;
  get?: Oas3Operation<T>;
  put?: Oas3Operation<T>;
  post?: Oas3Operation<T>;
  delete?: Oas3Operation<T>;
  options?: Oas3Operation<T>;
  head?: Oas3Operation<T>;
  patch?: Oas3Operation<T>;
  trace?: Oas3Operation<T>;
  servers?: Oas3Server[];
  parameters?: Array<Referenced<Oas3Parameter<T>>>;
}

export interface Oas3XCodeSample {
  lang: string;
  label?: string;
  source: string;
}

export interface Oas3Operation<T extends Oas3Schema | Oas3_1Schema = Oas3Schema | Oas3_1Schema> {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: Oas3ExternalDocs;
  operationId?: string;
  parameters?: Array<Referenced<Oas3Parameter<T>>>;
  requestBody?: Referenced<Oas3RequestBody<T>>;
  responses: Oas3Responses<T>;
  callbacks?: { [name: string]: Referenced<Oas3Callback<T>> };
  deprecated?: boolean;
  security?: Oas3SecurityRequirement[];
  servers?: Oas3Server[];
  'x-codeSamples'?: Oas3XCodeSample[];
  'x-code-samples'?: Oas3XCodeSample[]; // deprecated
  'x-hideTryItPanel'?: boolean;
}

export interface Oas3Parameter<T extends Oas3Schema | Oas3_1Schema = Oas3Schema | Oas3_1Schema> {
  name: string;
  in?: Oas3ParameterLocation;
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: Oas3ParameterStyle;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: Referenced<T>;
  example?: unknown;
  examples?: { [media: string]: Referenced<Oas3Example> };
  content?: { [media: string]: Oas3MediaType<T> };
}

export interface Oas3Example {
  value: unknown;
  summary?: string;
  description?: string;
  externalValue?: string;
}

export interface Oas3Xml {
  name?: string;
  namespace?: string;
  prefix?: string;
  attribute?: string;
  wrapped?: string;
}

// common fields for OpenAPI Schema v3.x
interface Oas3XSchemaBase<T extends Oas3Schema | Oas3_1Schema> {
  $ref?: string;
  properties?: { [name: string]: Referenced<T> };
  additionalProperties?: boolean | T;
  description?: string;
  default?: unknown;
  required?: string[];
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;
  format?: string;
  externalDocs?: Oas3ExternalDocs;
  discriminator?: Oas3Discriminator;
  oneOf?: T[];
  anyOf?: T[];
  allOf?: T[];
  not?: T;
  title?: string;
  multipleOf?: number;
  maximum?: number;
  minimum?: number;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  items?: boolean | T;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxProperties?: number;
  minProperties?: number;
  enum?: unknown[];
  example?: unknown;

  xml?: Oas3Xml;
  'x-tags'?: string[];
}

export interface Oas3Schema extends Oas3XSchemaBase<Oas3Schema> {
  type?: string;
  exclusiveMaximum?: boolean;
  exclusiveMinimum?: boolean;
  nullable?: boolean;
}

export interface Oas3_1Schema extends Oas3XSchemaBase<Oas3_1Schema> {
  $id?: string;
  $schema?: string;
  $anchor?: string;
  $dynamicAnchor?: string;
  $dynamicRef?: string;
  $defs?: { [name: string]: Referenced<Oas3_1Schema> };
  $vocabulary?: { [uri: string]: boolean };
  $comment?: string;
  type?: string | string[];
  examples?: unknown[];
  prefixItems?: Oas3_1Schema[];
  exclusiveMaximum?: number;
  exclusiveMinimum?: number;
  const?: unknown;
  contains?: Oas3_1Schema;
  minContains?: number;
  maxContains?: number;
  propertyNames?: Oas3_1Schema;
  if?: Oas3_1Schema;
  then?: Oas3_1Schema;
  else?: Oas3_1Schema;
  dependentRequired?: { [name: string]: string[] };
  dependentSchemas?: { [name: string]: Referenced<Oas3_1Schema> };
  patternProperties?: { [name: string]: Referenced<Oas3_1Schema> };
  unevaluatedItems?: boolean | Oas3_1Schema;
  unevaluatedProperties?: boolean | Oas3_1Schema;
  contentSchema?: Oas3_1Schema;
  contentMediaType?: string;
  contentEncoding?: string;
}

export interface Oas3Webhooks<T extends Oas3Schema | Oas3_1Schema> {
  [webhook: string]: Referenced<Oas3PathItem<T>>;
}

export interface Oas3Discriminator {
  propertyName: string;
  mapping?: { [name: string]: string };
  'x-explicitMappingOnly'?: boolean;
}

export interface Oas3MediaType<T extends Oas3Schema | Oas3_1Schema = Oas3Schema | Oas3_1Schema> {
  schema?: Referenced<T>;
  example?: unknown;
  examples?: { [name: string]: Referenced<Oas3Example> };
  encoding?: { [field: string]: Oas3Encoding<T> };
}

export interface Oas3Encoding<T extends Oas3Schema | Oas3_1Schema = Oas3Schema | Oas3_1Schema> {
  contentType: string;
  headers?: { [name: string]: Referenced<Oas3Header<T>> };
  style: Oas3ParameterStyle;
  explode: boolean;
  allowReserved: boolean;
}

export type Oas3ParameterLocation = 'query' | 'header' | 'path' | 'cookie';
export type Oas3ParameterStyle =
  | 'matrix'
  | 'label'
  | 'form'
  | 'simple'
  | 'spaceDelimited'
  | 'pipeDelimited'
  | 'deepObject';

export interface Oas3RequestBody<T extends Oas3Schema | Oas3_1Schema = Oas3Schema | Oas3_1Schema> {
  description?: string;
  required?: boolean;
  content: { [mime: string]: Oas3MediaType<T> };
}

export interface Oas3Responses<T extends Oas3Schema | Oas3_1Schema = Oas3Schema | Oas3_1Schema> {
  [code: string]: Oas3Response<T>;
}

export interface Oas3Response<T extends Oas3Schema | Oas3_1Schema = Oas3Schema | Oas3_1Schema> {
  description?: string;
  headers?: { [name: string]: Referenced<Oas3Header<T>> };
  content?: { [mime: string]: Oas3MediaType<T> };
  links?: { [name: string]: Referenced<Oas3Link> };
}

export interface Oas3Link {
  operationRef?: string;
  operationId?: string;
  parameters?: { [name: string]: unknown };
  requestBody?: unknown;
  description?: string;
  server?: Oas3Server;
}

export type Oas3Header<T extends Oas3Schema | Oas3_1Schema = Oas3Schema | Oas3_1Schema> = Omit<
  Oas3Parameter<T>,
  'in' | 'name'
>;

export interface Oas3Callback<T extends Oas3Schema | Oas3_1Schema = Oas3Schema | Oas3_1Schema> {
  [name: string]: Oas3PathItem<T>;
}

// common fields for OAS components v3.x
export interface Oas3ComponentsBase<T extends Oas3Schema | Oas3_1Schema> {
  schemas?: { [name: string]: Referenced<T> };
  responses?: { [name: string]: Referenced<Oas3Response<T>> };
  parameters?: { [name: string]: Referenced<Oas3Parameter<T>> };
  examples?: { [name: string]: Referenced<Oas3Example> };
  requestBodies?: { [name: string]: Referenced<Oas3RequestBody<T>> };
  headers?: { [name: string]: Referenced<Oas3Header<T>> };
  securitySchemes?: { [name: string]: Referenced<Oas3SecurityScheme> };
  links?: { [name: string]: Referenced<Oas3Link> };
  callbacks?: { [name: string]: Referenced<Oas3Callback<T>> };
}

export interface Oas3_1Components extends Oas3ComponentsBase<Oas3_1Schema> {
  pathItems?: { [name: string]: Referenced<Oas3PathItem<Oas3_1Schema>> };
}

export interface Oas3Components extends Oas3ComponentsBase<Oas3Schema> {}

export type Oas3ComponentName<T extends Oas3Schema | Oas3_1Schema = Oas3Schema | Oas3_1Schema> =
  keyof Oas3ComponentsBase<T>;

export interface Oas3SecurityRequirement {
  [name: string]: string[];
}

export interface Oas3SecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat: string;
  flows: {
    implicit?: {
      refreshUrl?: string;
      scopes: Record<string, string>;
      authorizationUrl: string;
    };
    password?: {
      refreshUrl?: string;
      scopes: Record<string, string>;
      tokenUrl: string;
    };
    clientCredentials?: {
      refreshUrl?: string;
      scopes: Record<string, string>;
      tokenUrl: string;
    };
    authorizationCode?: {
      refreshUrl?: string;
      scopes: Record<string, string>;
      tokenUrl: string;
    };
  };
  openIdConnectUrl?: string;
}

export interface Oas3Tag {
  name: string;
  description?: string;
  externalDocs?: Oas3ExternalDocs;
  'x-displayName'?: string;
}

export interface Oas3ExternalDocs {
  description?: string;
  url: string;
}

export interface Oas3Contact {
  name?: string;
  url?: string;
  email?: string;
}

export interface Oas3License {
  name: string;
  url?: string;
}
