import { listOf, mapOf } from '.';

import type { NodeType } from '.';
import type { Oas2NodeType } from './redocly-yaml';

const responseCodeRegexp = /^[0-9][0-9Xx]{2}$/;

const Root: NodeType = {
  properties: {
    swagger: { type: 'string' },
    info: 'Info',
    host: { type: 'string' },
    basePath: { type: 'string' },
    schemes: { type: 'array', items: { type: 'string' } },
    consumes: { type: 'array', items: { type: 'string' } },
    produces: { type: 'array', items: { type: 'string' } },
    paths: 'Paths',
    definitions: 'NamedSchemas',
    parameters: 'NamedParameters',
    responses: 'NamedResponses',
    securityDefinitions: 'NamedSecuritySchemes',
    security: 'SecurityRequirementList',
    tags: 'TagList',
    externalDocs: 'ExternalDocs',
    'x-servers': 'XServerList',
    'x-tagGroups': 'TagGroups',
    'x-ignoredHeaderParameters': { type: 'array', items: { type: 'string' } },
  },
  required: ['swagger', 'paths', 'info'],
  extensionsPrefix: 'x-',
};

const Info: NodeType = {
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    termsOfService: { type: 'string' },
    contact: 'Contact',
    license: 'License',
    version: { type: 'string' },
    'x-logo': 'Logo',
  },
  required: ['title', 'version'],
  extensionsPrefix: 'x-',
};

const Logo: NodeType = {
  properties: {
    url: { type: 'string' },
    altText: { type: 'string' },
    backgroundColor: { type: 'string' },
    href: { type: 'string' },
  },
  extensionsPrefix: 'x-',
};

const Contact: NodeType = {
  properties: {
    name: { type: 'string' },
    url: { type: 'string' },
    email: { type: 'string' },
  },
  extensionsPrefix: 'x-',
};

const License: NodeType = {
  properties: {
    name: { type: 'string' },
    url: { type: 'string' },
  },
  required: ['name'],
  extensionsPrefix: 'x-',
};

const Paths: NodeType = {
  properties: {},
  additionalProperties: (_value: any, key: string) =>
    key.startsWith('/') ? 'PathItem' : undefined,
};

const PathItem: NodeType = {
  properties: {
    $ref: { type: 'string' }, // TODO: verify special $ref handling for Path Item
    parameters: 'ParameterList',

    get: 'Operation',
    put: 'Operation',
    post: 'Operation',
    delete: 'Operation',
    options: 'Operation',
    head: 'Operation',
    patch: 'Operation',
  },
  extensionsPrefix: 'x-',
};

const Operation: NodeType = {
  properties: {
    tags: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    description: { type: 'string' },
    externalDocs: 'ExternalDocs',
    operationId: { type: 'string' },
    consumes: { type: 'array', items: { type: 'string' } },
    produces: { type: 'array', items: { type: 'string' } },
    parameters: 'ParameterList',
    responses: 'Responses',
    schemes: { type: 'array', items: { type: 'string' } },
    deprecated: { type: 'boolean' },
    security: 'SecurityRequirementList',
    'x-codeSamples': 'XCodeSampleList',
    'x-code-samples': 'XCodeSampleList', // deprecated
    'x-hideTryItPanel': { type: 'boolean' },
  },
  required: ['responses'],
  extensionsPrefix: 'x-',
};

const XCodeSample: NodeType = {
  properties: {
    lang: { type: 'string' },
    label: { type: 'string' },
    source: { type: 'string' },
  },
};

const XServer: NodeType = {
  properties: {
    url: { type: 'string' },
    description: { type: 'string' },
  },
  required: ['url'],
};

const ExternalDocs: NodeType = {
  properties: {
    description: { type: 'string' },
    url: { type: 'string' },
  },
  required: ['url'],
  extensionsPrefix: 'x-',
};

const Parameter: NodeType = {
  properties: {
    name: { type: 'string' },
    in: { type: 'string', enum: ['query', 'header', 'path', 'formData', 'body'] },
    description: { type: 'string' },
    required: { type: 'boolean' },
    schema: 'Schema',
    type: { type: 'string', enum: ['string', 'number', 'integer', 'boolean', 'array', 'file'] },
    format: { type: 'string' },
    allowEmptyValue: { type: 'boolean' },
    items: 'ParameterItems',
    collectionFormat: { type: 'string', enum: ['csv', 'ssv', 'tsv', 'pipes', 'multi'] },
    default: null,
    maximum: { type: 'integer' },
    exclusiveMaximum: { type: 'boolean' },
    minimum: { type: 'integer' },
    exclusiveMinimum: { type: 'boolean' },
    maxLength: { type: 'integer' },
    minLength: { type: 'integer' },
    pattern: { type: 'string' },
    maxItems: { type: 'integer' },
    minItems: { type: 'integer' },
    uniqueItems: { type: 'boolean' },
    enum: { type: 'array' },
    multipleOf: { type: 'number' },
    'x-example': 'Example',
    'x-examples': 'ExamplesMap',
  },
  required(value) {
    if (!value || !value.in) {
      return ['name', 'in'];
    }
    if (value.in === 'body') {
      return ['name', 'in', 'schema'];
    } else {
      if (value.type === 'array') {
        return ['name', 'in', 'type', 'items'];
      } else {
        return ['name', 'in', 'type'];
      }
    }
  },
  extensionsPrefix: 'x-',
};

const ParameterItems: NodeType = {
  properties: {
    type: { type: 'string', enum: ['string', 'number', 'integer', 'boolean', 'array'] },
    format: { type: 'string' },
    items: 'ParameterItems',
    collectionFormat: { type: 'string', enum: ['csv', 'ssv', 'tsv', 'pipes', 'multi'] },
    default: null,
    maximum: { type: 'integer' },
    exclusiveMaximum: { type: 'boolean' },
    minimum: { type: 'integer' },
    exclusiveMinimum: { type: 'boolean' },
    maxLength: { type: 'integer' },
    minLength: { type: 'integer' },
    pattern: { type: 'string' },
    maxItems: { type: 'integer' },
    minItems: { type: 'integer' },
    uniqueItems: { type: 'boolean' },
    enum: { type: 'array' },
    multipleOf: { type: 'number' },
  },
  required(value) {
    if (value && value.type === 'array') {
      return ['type', 'items'];
    } else {
      return ['type'];
    }
  },
  extensionsPrefix: 'x-',
};

const Responses: NodeType = {
  properties: {
    default: 'Response',
  },
  additionalProperties: (_v: any, key: string) =>
    responseCodeRegexp.test(key) ? 'Response' : undefined,
};

const Response: NodeType = {
  properties: {
    description: { type: 'string' },
    schema: 'Schema',
    headers: mapOf('Header'),
    examples: 'Examples',
    'x-summary': { type: 'string' },
  },
  required: ['description'],
  extensionsPrefix: 'x-',
};

const Examples: NodeType = {
  properties: {},
  additionalProperties: { isExample: true },
};

const Header: NodeType = {
  properties: {
    description: { type: 'string' },
    type: { type: 'string', enum: ['string', 'number', 'integer', 'boolean', 'array'] },
    format: { type: 'string' },
    items: 'ParameterItems',
    collectionFormat: { type: 'string', enum: ['csv', 'ssv', 'tsv', 'pipes', 'multi'] },
    default: null,
    maximum: { type: 'integer' },
    exclusiveMaximum: { type: 'boolean' },
    minimum: { type: 'integer' },
    exclusiveMinimum: { type: 'boolean' },
    maxLength: { type: 'integer' },
    minLength: { type: 'integer' },
    pattern: { type: 'string' },
    maxItems: { type: 'integer' },
    minItems: { type: 'integer' },
    uniqueItems: { type: 'boolean' },
    enum: { type: 'array' },
    multipleOf: { type: 'number' },
  },
  required(value) {
    if (value && value.type === 'array') {
      return ['type', 'items'];
    } else {
      return ['type'];
    }
  },
  extensionsPrefix: 'x-',
};

const Tag: NodeType = {
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    externalDocs: 'ExternalDocs',
    'x-traitTag': { type: 'boolean' },
    'x-displayName': { type: 'string' },
  },
  required: ['name'],
  extensionsPrefix: 'x-',
};

const TagGroup: NodeType = {
  properties: {
    name: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
  },
};

const Schema: NodeType = {
  properties: {
    format: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    default: null,
    multipleOf: { type: 'number' },
    maximum: { type: 'number' },
    minimum: { type: 'number' },
    exclusiveMaximum: { type: 'boolean' },
    exclusiveMinimum: { type: 'boolean' },
    maxLength: { type: 'number' },
    minLength: { type: 'number' },
    pattern: { type: 'string' },
    maxItems: { type: 'number' },
    minItems: { type: 'number' },
    uniqueItems: { type: 'boolean' },
    maxProperties: { type: 'number' },
    minProperties: { type: 'number' },
    required: { type: 'array', items: { type: 'string' } },
    enum: { type: 'array' },
    type: {
      type: 'string',
      enum: ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'],
    },
    items: (value: any) => {
      if (Array.isArray(value)) {
        return listOf('Schema');
      } else {
        return 'Schema';
      }
    },
    allOf: listOf('Schema'),
    properties: 'SchemaProperties',
    additionalProperties: (value: any) => {
      if (typeof value === 'boolean') {
        return { type: 'boolean' };
      } else {
        return 'Schema';
      }
    },
    discriminator: { type: 'string' },
    readOnly: { type: 'boolean' },
    xml: 'Xml',
    externalDocs: 'ExternalDocs',
    example: { isExample: true },
    'x-tags': { type: 'array', items: { type: 'string' } },
    'x-nullable': { type: 'boolean' },
    'x-extendedDiscriminator': { type: 'string' },
    'x-additionalPropertiesName': { type: 'string' },
    'x-explicitMappingOnly': { type: 'boolean' },
    'x-enumDescriptions': 'EnumDescriptions',
  },
  extensionsPrefix: 'x-',
};

const EnumDescriptions: NodeType = {
  properties: {},
  additionalProperties: { type: 'string' },
};

const SchemaProperties: NodeType = {
  properties: {},
  additionalProperties: 'Schema',
};

const Xml: NodeType = {
  properties: {
    name: { type: 'string' },
    namespace: { type: 'string' },
    prefix: { type: 'string' },
    attribute: { type: 'boolean' },
    wrapped: { type: 'boolean' },
  },
  extensionsPrefix: 'x-',
};

const SecurityScheme: NodeType = {
  properties: {
    type: { enum: ['basic', 'apiKey', 'oauth2'] },
    description: { type: 'string' },
    name: { type: 'string' },
    in: { type: 'string', enum: ['query', 'header'] },
    flow: { enum: ['implicit', 'password', 'application', 'accessCode'] },
    authorizationUrl: { type: 'string' },
    tokenUrl: { type: 'string' },
    scopes: { type: 'object', additionalProperties: { type: 'string' } },
    'x-defaultClientId': { type: 'string' },
  },
  required(value) {
    switch (value?.type) {
      case 'apiKey':
        return ['type', 'name', 'in'];
      case 'oauth2':
        switch (value?.flow) {
          case 'implicit':
            return ['type', 'flow', 'authorizationUrl', 'scopes'];
          case 'accessCode':
            return ['type', 'flow', 'authorizationUrl', 'tokenUrl', 'scopes'];
          case 'application':
          case 'password':
            return ['type', 'flow', 'tokenUrl', 'scopes'];
          default:
            return ['type', 'flow', 'scopes'];
        }
      default:
        return ['type'];
    }
  },
  allowed(value) {
    switch (value?.type) {
      case 'basic':
        return ['type', 'description'];
      case 'apiKey':
        return ['type', 'name', 'in', 'description'];
      case 'oauth2':
        switch (value?.flow) {
          case 'implicit':
            return ['type', 'flow', 'authorizationUrl', 'description', 'scopes'];
          case 'accessCode':
            return ['type', 'flow', 'authorizationUrl', 'tokenUrl', 'description', 'scopes'];
          case 'application':
          case 'password':
            return ['type', 'flow', 'tokenUrl', 'description', 'scopes'];
          default:
            return ['type', 'flow', 'tokenUrl', 'authorizationUrl', 'description', 'scopes'];
        }
      default:
        return ['type', 'description'];
    }
  },
  extensionsPrefix: 'x-',
};

const SecurityRequirement: NodeType = {
  properties: {},
  additionalProperties: { type: 'array', items: { type: 'string' } },
};

const Example: NodeType = {
  properties: {
    value: { isExample: true },
    summary: { type: 'string' },
    description: { type: 'string' },
    externalValue: { type: 'string' },
  },
  extensionsPrefix: 'x-',
};

export const Oas2Types: Record<Oas2NodeType, NodeType> = {
  Root,
  Tag,
  TagList: listOf('Tag'),
  TagGroups: listOf('TagGroup'),
  TagGroup,
  ExternalDocs,
  Example,
  ExamplesMap: mapOf('Example'),
  EnumDescriptions,
  SecurityRequirement,
  SecurityRequirementList: listOf('SecurityRequirement'),
  Info,
  Contact,
  License,
  Logo,
  Paths,
  PathItem,
  Parameter,
  ParameterItems,
  ParameterList: listOf('Parameter'),
  Operation,
  Examples,
  Header,
  Responses,
  Response,
  Schema,
  Xml,
  SchemaProperties,
  NamedSchemas: mapOf('Schema'),
  NamedResponses: mapOf('Response'),
  NamedParameters: mapOf('Parameter'),
  NamedSecuritySchemes: mapOf('SecurityScheme'),
  SecurityScheme,
  XCodeSample,
  XCodeSampleList: listOf('XCodeSample'),
  XServerList: listOf('XServer'),
  XServer,
};
