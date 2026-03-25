import type { Schema } from 'js-yaml';
import type { Referenced } from './openapi';

export interface Oas2Definition {
  swagger: '2.0';
  info?: Oas2Info;
  paths?: Oas2Paths;

  basePath?: string;
  schemes?: string[];
  consumes?: string[];
  produces?: string[];

  definitions?: Record<string, Oas2Schema>;
  responses?: Record<string, Oas2Response>;
  parameters?: Record<string, Oas2Parameter>;
  securityDefinitions?: Record<string, Oas2SecurityScheme>;
  security?: Oas2SecurityRequirement[];
  tags?: Oas2Tag[];
  externalDocs?: Oas2ExternalDocs;
}

export interface Oas2Components {
  definitions?: { [name: string]: Record<string, Oas2Schema> };
  securityDefinitions?: { [name: string]: Record<string, Oas2SecurityScheme> };
  responses?: { [name: string]: Record<string, Oas2Response> };
  parameters?: { [name: string]: Record<string, Oas2Parameter> };
}

export interface Oas2Info {
  title: string;
  version: string;

  description?: string;
  termsOfService?: string;
  contact?: Oas2Contact;
  license?: Oas2License;
}

export interface Oas2Paths {
  [path: string]: Oas2PathItem;
}

export interface Oas2PathItem {
  get?: Oas2Operation;
  put?: Oas2Operation;
  post?: Oas2Operation;
  delete?: Oas2Operation;
  options?: Oas2Operation;
  head?: Oas2Operation;
  patch?: Oas2Operation;
  parameters?: Array<Referenced<Oas2Parameter>>;
}

export interface Oas2XCodeSample {
  lang: string;
  label?: string;
  source: string;
}

export interface Oas2Operation {
  tags?: string[];
  consumes?: string[];
  produces?: string[];
  schemes?: string[];
  summary?: string;
  description?: string;
  externalDocs?: Oas2ExternalDocs;
  operationId?: string;
  parameters?: Array<Referenced<Oas2Parameter>>;
  responses: Oas2Responses;
  deprecated?: boolean;
  security?: Oas2SecurityRequirement[];
  'x-codeSamples'?: Oas2XCodeSample[];
  'x-code-samples'?: Oas2XCodeSample[]; // deprecated
  'x-hideTryItPanel'?: boolean;
}

export type Oas2Parameter = Oas2BodyParameter | Oas2SimpleParameter;

export interface Oas2BodyParameter {
  name: string;
  in: 'body';
  schema: Oas2Schema;

  description?: string;
  required?: boolean;
}

export interface Oas2SimpleParameter {
  name: string;
  in: Oas2ParameterLocation;
  description?: string;
  required?: boolean;
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'file';

  format?: string;
  allowEmptyValue?: boolean;
  items?: Oas2Items;
  collectionFormat?: 'csv' | 'ssv' | 'tsv' | 'pipes' | 'multi';
  default?: any;
  maximum?: number;
  exclusiveMaximum?: boolean;
  minimum?: number;
  exclusiveMinimum?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  enum?: any[];
  multipleOf?: number;
}

export interface Oas2Items {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array';

  format?: string;
  allowEmptyValue?: boolean;
  items?: Oas2Items;
  collectionFormat?: 'csv' | 'ssv' | 'tsv' | 'pipes' | 'multi';
  default?: any;
  maximum?: number;
  exclusiveMaximum?: boolean;
  minimum?: number;
  exclusiveMinimum?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  enum?: any[];
  multipleOf?: number;
}

export interface Oas2Xml {
  name?: string;
  namespace?: string;
  prefix?: string;
  attribute?: string;
  wrapped?: string;
}

export interface Oas2Schema {
  $ref?: string;
  type?: string;
  properties?: { [name: string]: Oas2Schema };
  additionalProperties?: boolean | Oas2Schema;
  description?: string;
  default?: any;
  items?: Oas2Schema;
  required?: string[];
  readOnly?: boolean;
  deprecated?: boolean;
  format?: string;
  externalDocs?: Oas2ExternalDocs;
  discriminator?: string;
  nullable?: boolean;
  allOf?: Oas2Schema[];

  title?: string;
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: boolean;
  minimum?: number;
  exclusiveMinimum?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxProperties?: number;
  minProperties?: number;
  enum?: any[];
  example?: any;

  xml?: Oas2Xml;
  'x-tags'?: string[];
}

export type Oas2ParameterLocation = 'query' | 'header' | 'path' | 'formData';

export interface Oas2Responses {
  [code: string]: Oas2Response;
}

export type Oas2Header = Oas2Items & { description?: 'string' };

export interface Oas2Response {
  description?: string;
  schema: Referenced<Schema>;
  examples?: Record<string, any>;
  headers?: Record<string, Oas2Header>;
}

export interface Oas2SecurityRequirement {
  [name: string]: string[];
}

export interface Oas2SecurityScheme {
  type: 'basic' | 'apiKey' | 'oauth2';
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  flow: 'implicit' | 'password' | 'application' | 'accessCode';
  authorizationUrl?: string;
  tokenUrl?: string;
  scopes?: Record<string, string>;
}

export interface Oas2Tag {
  name: string;
  description?: string;
  externalDocs?: Oas2ExternalDocs;
  'x-displayName'?: string;
}

export interface Oas2ExternalDocs {
  description?: string;
  url: string;
}

export interface Oas2Contact {
  name?: string;
  url?: string;
  email?: string;
}

export interface Oas2License {
  name: string;
  url?: string;
}
