import { listOf, mapOf } from '.';
import { Oas3Types } from './oas3';

import type { NodeType } from '.';
import type { Oas3_1NodeType } from './redocly-yaml';

const Root: NodeType = {
  properties: {
    openapi: null,
    info: 'Info',
    servers: 'ServerList',
    security: 'SecurityRequirementList',
    tags: 'TagList',
    externalDocs: 'ExternalDocs',
    paths: 'Paths',
    webhooks: 'WebhooksMap',
    components: 'Components',
    jsonSchemaDialect: { type: 'string' },
  },
  required: ['openapi', 'info'],
  requiredOneOf: ['paths', 'components', 'webhooks'],
  extensionsPrefix: 'x-',
};

const License: NodeType = {
  properties: {
    name: { type: 'string' },
    url: { type: 'string' },
    identifier: { type: 'string' },
  },
  required: ['name'],
  extensionsPrefix: 'x-',
};

const Info: NodeType = {
  properties: {
    title: { type: 'string' },
    version: { type: 'string' },
    description: { type: 'string' },
    termsOfService: { type: 'string' },
    summary: { type: 'string' },
    contact: 'Contact',
    license: 'License',
    'x-logo': 'Logo',
  },
  required: ['title', 'version'],
  extensionsPrefix: 'x-',
};

const Components: NodeType = {
  properties: {
    parameters: 'NamedParameters',
    schemas: 'NamedSchemas',
    responses: 'NamedResponses',
    examples: 'NamedExamples',
    requestBodies: 'NamedRequestBodies',
    headers: 'NamedHeaders',
    securitySchemes: 'NamedSecuritySchemes',
    links: 'NamedLinks',
    callbacks: 'NamedCallbacks',
    pathItems: 'NamedPathItems',
  },
  extensionsPrefix: 'x-',
};

const Operation: NodeType = {
  properties: {
    tags: {
      type: 'array',
      items: { type: 'string' },
    },
    summary: { type: 'string' },
    description: { type: 'string' },
    externalDocs: 'ExternalDocs',
    operationId: { type: 'string' },
    parameters: 'ParameterList',
    security: 'SecurityRequirementList',
    servers: 'ServerList',
    requestBody: 'RequestBody',
    responses: 'Responses',
    deprecated: { type: 'boolean' },
    callbacks: 'CallbacksMap',
    'x-codeSamples': 'XCodeSampleList',
    'x-code-samples': 'XCodeSampleList', // deprecated
    'x-hideTryItPanel': { type: 'boolean' },
  },
  extensionsPrefix: 'x-',
};

export const Schema: NodeType = {
  properties: {
    $id: { type: 'string' },
    $anchor: { type: 'string' },
    id: { type: 'string' },
    $schema: { type: 'string' },
    definitions: 'NamedSchemas',
    $defs: 'NamedSchemas',
    $vocabulary: { type: 'string' },
    externalDocs: 'ExternalDocs',
    discriminator: 'Discriminator',
    title: { type: 'string' },
    multipleOf: { type: 'number', minimum: 0 },
    maximum: { type: 'number' },
    minimum: { type: 'number' },
    exclusiveMaximum: { type: 'number' },
    exclusiveMinimum: { type: 'number' },
    maxLength: { type: 'integer', minimum: 0 },
    minLength: { type: 'integer', minimum: 0 },
    pattern: { type: 'string' },
    maxItems: { type: 'integer', minimum: 0 },
    minItems: { type: 'integer', minimum: 0 },
    uniqueItems: { type: 'boolean' },
    maxProperties: { type: 'integer', minimum: 0 },
    minProperties: { type: 'integer', minimum: 0 },
    required: { type: 'array', items: { type: 'string' } },
    enum: { type: 'array' },
    type: (value: any) => {
      if (Array.isArray(value)) {
        return {
          type: 'array',
          items: { enum: ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'] },
        };
      } else {
        return {
          enum: ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'],
        };
      }
    },
    allOf: listOf('Schema'),
    anyOf: listOf('Schema'),
    oneOf: listOf('Schema'),
    not: 'Schema',
    if: 'Schema',
    then: 'Schema',
    else: 'Schema',
    dependentSchemas: mapOf('Schema'),
    dependentRequired: 'DependentRequired',
    prefixItems: listOf('Schema'),
    contains: 'Schema',
    minContains: { type: 'integer', minimum: 0 },
    maxContains: { type: 'integer', minimum: 0 },
    patternProperties: 'PatternProperties',
    propertyNames: 'Schema',
    unevaluatedItems: (value: unknown) => {
      if (typeof value === 'boolean') {
        return { type: 'boolean' };
      } else {
        return 'Schema';
      }
    },
    unevaluatedProperties: (value: unknown) => {
      if (typeof value === 'boolean') {
        return { type: 'boolean' };
      } else {
        return 'Schema';
      }
    },
    summary: { type: 'string' },
    properties: 'SchemaProperties',
    items: (value: any) => {
      if (typeof value === 'boolean') {
        return { type: 'boolean' };
      } else {
        return 'Schema';
      }
    },
    additionalProperties: (value: any) => {
      return typeof value === 'boolean' ? { type: 'boolean' } : 'Schema';
    },
    description: { type: 'string' },
    format: { type: 'string' },
    contentEncoding: { type: 'string' },
    contentMediaType: { type: 'string' },
    contentSchema: 'Schema',
    default: null,
    readOnly: { type: 'boolean' },
    writeOnly: { type: 'boolean' },
    xml: 'Xml',
    examples: { type: 'array' },
    example: { isExample: true },
    deprecated: { type: 'boolean' },
    const: null,
    $comment: { type: 'string' },
    'x-tags': { type: 'array', items: { type: 'string' } },
    $dynamicAnchor: { type: 'string' },
    $dynamicRef: { type: 'string' },
  },
  extensionsPrefix: 'x-',
};

export const SchemaProperties: NodeType = {
  properties: {},
  additionalProperties: (value: any) => {
    if (typeof value === 'boolean') {
      return { type: 'boolean' };
    } else {
      return 'Schema';
    }
  },
};

const SecurityScheme: NodeType = {
  properties: {
    type: { enum: ['apiKey', 'http', 'oauth2', 'openIdConnect', 'mutualTLS'] },
    description: { type: 'string' },
    name: { type: 'string' },
    in: { type: 'string', enum: ['query', 'header', 'cookie'] },
    scheme: { type: 'string' },
    bearerFormat: { type: 'string' },
    flows: 'OAuth2Flows',
    openIdConnectUrl: { type: 'string' },
  },
  required(value) {
    switch (value?.type) {
      case 'apiKey':
        return ['type', 'name', 'in'];
      case 'http':
        return ['type', 'scheme'];
      case 'oauth2':
        return ['type', 'flows'];
      case 'openIdConnect':
        return ['type', 'openIdConnectUrl'];
      default:
        return ['type'];
    }
  },
  allowed(value) {
    switch (value?.type) {
      case 'apiKey':
        return ['type', 'name', 'in', 'description'];
      case 'http':
        return ['type', 'scheme', 'bearerFormat', 'description'];
      case 'oauth2':
        switch (value?.flows) {
          case 'implicit':
            return ['type', 'flows', 'authorizationUrl', 'refreshUrl', 'description', 'scopes'];
          case 'password':
          case 'clientCredentials':
            return ['type', 'flows', 'tokenUrl', 'refreshUrl', 'description', 'scopes'];
          case 'authorizationCode':
            return [
              'type',
              'flows',
              'authorizationUrl',
              'refreshUrl',
              'tokenUrl',
              'description',
              'scopes',
            ];
          default:
            return [
              'type',
              'flows',
              'authorizationUrl',
              'refreshUrl',
              'tokenUrl',
              'description',
              'scopes',
            ];
        }
      case 'openIdConnect':
        return ['type', 'openIdConnectUrl', 'description'];
      case 'mutualTLS':
        return ['type', 'description'];
      default:
        return ['type', 'description'];
    }
  },
  extensionsPrefix: 'x-',
};

export const DependentRequired: NodeType = {
  properties: {},
  additionalProperties: { type: 'array', items: { type: 'string' } },
};

export const Oas3_1Types: Record<Oas3_1NodeType, NodeType> = {
  ...Oas3Types,
  Info,
  Root,
  Schema,
  SchemaProperties,
  PatternProperties: SchemaProperties,
  License,
  Components,
  NamedPathItems: mapOf('PathItem'),
  SecurityScheme,
  Operation,
  DependentRequired,
};
