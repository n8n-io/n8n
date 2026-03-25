import { listOf, mapOf } from '.';
import { isMappingRef } from '../ref-utils';

import type { NodeType } from '.';
import type { Oas3NodeType } from './redocly-yaml';

const responseCodeRegexp = /^[0-9][0-9Xx]{2}$/;

const Root: NodeType = {
  properties: {
    openapi: null,
    info: 'Info',
    servers: 'ServerList',
    security: 'SecurityRequirementList',
    tags: 'TagList',
    externalDocs: 'ExternalDocs',
    paths: 'Paths',
    components: 'Components',
    'x-webhooks': 'WebhooksMap',
    'x-tagGroups': 'TagGroups',
    'x-ignoredHeaderParameters': { type: 'array', items: { type: 'string' } },
  },
  required: ['openapi', 'paths', 'info'],
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
  extensionsPrefix: 'x-',
};

export const ExternalDocs: NodeType = {
  properties: {
    description: { type: 'string' },
    url: { type: 'string' },
  },
  required: ['url'],
  extensionsPrefix: 'x-',
};

const Server: NodeType = {
  properties: {
    url: { type: 'string' },
    description: { type: 'string' },
    variables: 'ServerVariablesMap',
  },
  required: ['url'],
  extensionsPrefix: 'x-',
};

const ServerVariable: NodeType = {
  properties: {
    enum: {
      type: 'array',
      items: { type: 'string' },
    },
    default: { type: 'string' },
    description: { type: 'string' },
  },
  required: ['default'],
  extensionsPrefix: 'x-',
};

const SecurityRequirement: NodeType = {
  properties: {},
  additionalProperties: { type: 'array', items: { type: 'string' } },
};

const Info: NodeType = {
  properties: {
    title: { type: 'string' },
    version: { type: 'string' },
    description: { type: 'string' },
    termsOfService: { type: 'string' },
    contact: 'Contact',
    license: 'License',
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

const WebhooksMap: NodeType = {
  properties: {},
  additionalProperties: () => 'PathItem',
};

const PathItem: NodeType = {
  properties: {
    $ref: { type: 'string' }, // TODO: verify special $ref handling for Path Item
    servers: 'ServerList',
    parameters: 'ParameterList',
    summary: { type: 'string' },
    description: { type: 'string' },
    get: 'Operation',
    put: 'Operation',
    post: 'Operation',
    delete: 'Operation',
    options: 'Operation',
    head: 'Operation',
    patch: 'Operation',
    trace: 'Operation',
  },
  extensionsPrefix: 'x-',
};

const Parameter: NodeType = {
  properties: {
    name: { type: 'string' },
    in: { enum: ['query', 'header', 'path', 'cookie'] },
    description: { type: 'string' },
    required: { type: 'boolean' },
    deprecated: { type: 'boolean' },
    allowEmptyValue: { type: 'boolean' },
    style: {
      enum: ['form', 'simple', 'label', 'matrix', 'spaceDelimited', 'pipeDelimited', 'deepObject'],
    },
    explode: { type: 'boolean' },
    allowReserved: { type: 'boolean' },
    schema: 'Schema',
    example: { isExample: true },
    examples: 'ExamplesMap',
    content: 'MediaTypesMap',
  },
  required: ['name', 'in'],
  requiredOneOf: ['schema', 'content'],
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

const RequestBody: NodeType = {
  properties: {
    description: { type: 'string' },
    required: { type: 'boolean' },
    content: 'MediaTypesMap',
  },
  required: ['content'],
  extensionsPrefix: 'x-',
};

const MediaTypesMap: NodeType = {
  properties: {},
  additionalProperties: 'MediaType',
};

const MediaType: NodeType = {
  properties: {
    schema: 'Schema',
    example: { isExample: true },
    examples: 'ExamplesMap',
    encoding: 'EncodingMap',
  },
  extensionsPrefix: 'x-',
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

const Encoding: NodeType = {
  properties: {
    contentType: { type: 'string' },
    headers: 'HeadersMap',
    style: {
      enum: ['form', 'simple', 'label', 'matrix', 'spaceDelimited', 'pipeDelimited', 'deepObject'],
    },
    explode: { type: 'boolean' },
    allowReserved: { type: 'boolean' },
  },
  extensionsPrefix: 'x-',
};

const EnumDescriptions: NodeType = {
  properties: {},
  additionalProperties: { type: 'string' },
};

const Header: NodeType = {
  properties: {
    description: { type: 'string' },
    required: { type: 'boolean' },
    deprecated: { type: 'boolean' },
    allowEmptyValue: { type: 'boolean' },
    style: {
      enum: ['form', 'simple', 'label', 'matrix', 'spaceDelimited', 'pipeDelimited', 'deepObject'],
    },
    explode: { type: 'boolean' },
    allowReserved: { type: 'boolean' },
    schema: 'Schema',
    example: { isExample: true },
    examples: 'ExamplesMap',
    content: 'MediaTypesMap',
  },
  requiredOneOf: ['schema', 'content'],
  extensionsPrefix: 'x-',
};

const Responses: NodeType = {
  properties: { default: 'Response' },
  additionalProperties: (_v: any, key: string) =>
    responseCodeRegexp.test(key) ? 'Response' : undefined,
};

const Response: NodeType = {
  properties: {
    description: { type: 'string' },
    headers: 'HeadersMap',
    content: 'MediaTypesMap',
    links: 'LinksMap',
    'x-summary': { type: 'string' },
  },
  required: ['description'],
  extensionsPrefix: 'x-',
};

const Link: NodeType = {
  properties: {
    operationRef: { type: 'string' },
    operationId: { type: 'string' },
    parameters: null, // TODO: figure out how to describe/validate this
    requestBody: null, // TODO: figure out how to describe/validate this
    description: { type: 'string' },
    server: 'Server',
  },
  extensionsPrefix: 'x-',
};

const Schema: NodeType = {
  properties: {
    externalDocs: 'ExternalDocs',
    discriminator: 'Discriminator',
    title: { type: 'string' },
    multipleOf: { type: 'number', minimum: 0 },
    maximum: { type: 'number' },
    minimum: { type: 'number' },
    exclusiveMaximum: { type: 'boolean' },
    exclusiveMinimum: { type: 'boolean' },
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
    type: {
      enum: ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'],
    },
    allOf: listOf('Schema'),
    anyOf: listOf('Schema'),
    oneOf: listOf('Schema'),
    not: 'Schema',
    properties: 'SchemaProperties',
    items: (value: any) => {
      if (Array.isArray(value)) {
        return listOf('Schema');
      } else {
        return 'Schema';
      }
    },
    additionalProperties: (value: any) => {
      if (typeof value === 'boolean') {
        return { type: 'boolean' };
      } else {
        return 'Schema';
      }
    },
    description: { type: 'string' },
    format: { type: 'string' },
    default: null,
    nullable: { type: 'boolean' },
    readOnly: { type: 'boolean' },
    writeOnly: { type: 'boolean' },
    xml: 'Xml',
    example: { isExample: true },
    deprecated: { type: 'boolean' },
    'x-tags': { type: 'array', items: { type: 'string' } },
    'x-additionalPropertiesName': { type: 'string' },
    'x-explicitMappingOnly': { type: 'boolean' },
  },
  extensionsPrefix: 'x-',
};

export const Xml: NodeType = {
  properties: {
    name: { type: 'string' },
    namespace: { type: 'string' },
    prefix: { type: 'string' },
    attribute: { type: 'boolean' },
    wrapped: { type: 'boolean' },
  },
  extensionsPrefix: 'x-',
};

const SchemaProperties: NodeType = {
  properties: {},
  additionalProperties: 'Schema',
};

export const DiscriminatorMapping: NodeType = {
  properties: {},
  additionalProperties: (value: any) => {
    if (isMappingRef(value)) {
      return { type: 'string', directResolveAs: 'Schema' };
    } else {
      return { type: 'string' };
    }
  },
};

export const Discriminator: NodeType = {
  properties: {
    propertyName: { type: 'string' },
    mapping: 'DiscriminatorMapping',
  },
  required: ['propertyName'],
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
  },
  extensionsPrefix: 'x-',
};

const ImplicitFlow: NodeType = {
  properties: {
    refreshUrl: { type: 'string' },
    scopes: { type: 'object', additionalProperties: { type: 'string' } }, // TODO: validate scopes
    authorizationUrl: { type: 'string' },
  },
  required: ['authorizationUrl', 'scopes'],
  extensionsPrefix: 'x-',
};

const PasswordFlow: NodeType = {
  properties: {
    refreshUrl: { type: 'string' },
    scopes: { type: 'object', additionalProperties: { type: 'string' } }, // TODO: validate scopes
    tokenUrl: { type: 'string' },
  },
  required: ['tokenUrl', 'scopes'],
  extensionsPrefix: 'x-',
};

const ClientCredentials: NodeType = {
  properties: {
    refreshUrl: { type: 'string' },
    scopes: { type: 'object', additionalProperties: { type: 'string' } }, // TODO: validate scopes
    tokenUrl: { type: 'string' },
  },
  required: ['tokenUrl', 'scopes'],
  extensionsPrefix: 'x-',
};

const AuthorizationCode: NodeType = {
  properties: {
    refreshUrl: { type: 'string' },
    authorizationUrl: { type: 'string' },
    scopes: { type: 'object', additionalProperties: { type: 'string' } }, // TODO: validate scopes
    tokenUrl: { type: 'string' },
    'x-usePkce': (value: any) => {
      if (typeof value === 'boolean') {
        return { type: 'boolean' };
      } else {
        return 'XUsePkce';
      }
    },
  },
  required: ['authorizationUrl', 'tokenUrl', 'scopes'],
  extensionsPrefix: 'x-',
};

const OAuth2Flows: NodeType = {
  properties: {
    implicit: 'ImplicitFlow',
    password: 'PasswordFlow',
    clientCredentials: 'ClientCredentials',
    authorizationCode: 'AuthorizationCode',
  },
  extensionsPrefix: 'x-',
};

const SecurityScheme: NodeType = {
  properties: {
    type: { enum: ['apiKey', 'http', 'oauth2', 'openIdConnect'] },
    description: { type: 'string' },
    name: { type: 'string' },
    in: { type: 'string', enum: ['query', 'header', 'cookie'] },
    scheme: { type: 'string' },
    bearerFormat: { type: 'string' },
    flows: 'OAuth2Flows',
    openIdConnectUrl: { type: 'string' },
    'x-defaultClientId': { type: 'string' },
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
        return ['type', 'flows', 'description'];
      case 'openIdConnect':
        return ['type', 'openIdConnectUrl', 'description'];
      default:
        return ['type', 'description'];
    }
  },
  extensionsPrefix: 'x-',
};

const XUsePkce: NodeType = {
  properties: {
    disableManualConfiguration: { type: 'boolean' },
    hideClientSecretInput: { type: 'boolean' },
  },
};

export const Oas3Types: Record<Oas3NodeType, NodeType> = {
  Root,
  Tag,
  TagList: listOf('Tag'),
  TagGroups: listOf('TagGroup'),
  TagGroup,
  ExternalDocs,
  Server,
  ServerList: listOf('Server'),
  ServerVariable,
  ServerVariablesMap: mapOf('ServerVariable'),
  SecurityRequirement,
  SecurityRequirementList: listOf('SecurityRequirement'),
  Info,
  Contact,
  License,
  Paths,
  PathItem,
  Parameter,
  ParameterList: listOf('Parameter'),
  Operation,
  Callback: mapOf('PathItem'),
  CallbacksMap: mapOf('Callback'),
  RequestBody,
  MediaTypesMap,
  MediaType,
  Example,
  ExamplesMap: mapOf('Example'),
  Encoding,
  EncodingMap: mapOf('Encoding'),
  EnumDescriptions,
  Header,
  HeadersMap: mapOf('Header'),
  Responses,
  Response,
  Link,
  Logo,
  Schema,
  Xml,
  SchemaProperties,
  DiscriminatorMapping,
  Discriminator,
  Components,
  LinksMap: mapOf('Link'),
  NamedSchemas: mapOf('Schema'),
  NamedResponses: mapOf('Response'),
  NamedParameters: mapOf('Parameter'),
  NamedExamples: mapOf('Example'),
  NamedRequestBodies: mapOf('RequestBody'),
  NamedHeaders: mapOf('Header'),
  NamedSecuritySchemes: mapOf('SecurityScheme'),
  NamedLinks: mapOf('Link'),
  NamedCallbacks: mapOf('Callback'),
  ImplicitFlow,
  PasswordFlow,
  ClientCredentials,
  AuthorizationCode,
  OAuth2Flows,
  SecurityScheme,
  XCodeSample,
  XCodeSampleList: listOf('XCodeSample'),
  XUsePkce,
  WebhooksMap,
};
