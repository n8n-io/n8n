import type { Oas2Definition } from '@redocly/openapi-core';
import type { Oas3_1Definition, Oas3Definition } from '@redocly/openapi-core/lib/typings/openapi';

export type Definition = Oas3_1Definition | Oas3Definition | Oas2Definition;
export interface ComponentsFiles {
  [schemas: string]: any;
}
export interface RefObject {
  [$ref: string]: string;
}

export const COMPONENTS = 'components';
export const PATHS = 'paths';
export const WEBHOOKS = 'webhooks';
export const xWEBHOOKS = 'x-webhooks';
export enum OPENAPI3_METHOD {
  get = 'get',
  put = 'put',
  post = 'post',
  delete = 'delete',
  options = 'options',
  head = 'head',
  patch = 'patch',
  trace = 'trace',
}

export const OPENAPI3_METHOD_NAMES: OPENAPI3_METHOD[] = [
  OPENAPI3_METHOD.get,
  OPENAPI3_METHOD.put,
  OPENAPI3_METHOD.post,
  OPENAPI3_METHOD.delete,
  OPENAPI3_METHOD.options,
  OPENAPI3_METHOD.head,
  OPENAPI3_METHOD.patch,
  OPENAPI3_METHOD.trace,
];

export enum OPENAPI3_COMPONENT {
  Schemas = 'schemas',
  Responses = 'responses',
  Parameters = 'parameters',
  Examples = 'examples',
  Headers = 'headers',
  RequestBodies = 'requestBodies',
  Links = 'links',
  Callbacks = 'callbacks',
  SecuritySchemes = 'securitySchemes',
}

export const OPENAPI3_COMPONENT_NAMES: OPENAPI3_COMPONENT[] = [
  OPENAPI3_COMPONENT.RequestBodies,
  OPENAPI3_COMPONENT.Schemas,
  OPENAPI3_COMPONENT.Responses,
  OPENAPI3_COMPONENT.Parameters,
  OPENAPI3_COMPONENT.Examples,
  OPENAPI3_COMPONENT.Headers,
  OPENAPI3_COMPONENT.Links,
  OPENAPI3_COMPONENT.Callbacks,
  OPENAPI3_COMPONENT.SecuritySchemes,
];
