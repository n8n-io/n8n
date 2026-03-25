import { listOf, mapOf } from '.';
import {
  AsyncApi2Bindings,
  Schema,
  Dependencies,
  Discriminator,
  DiscriminatorMapping,
  SchemaProperties,
  CorrelationId,
  Tag,
  ServerMap,
  ExternalDocs,
  SecuritySchemeFlows,
  ServerVariable,
  Contact,
  License,
  MessageExample,
} from './asyncapi2';

import type { NodeType } from '.';

const Root: NodeType = {
  properties: {
    asyncapi: { type: 'string', enum: ['3.0.0'] },
    info: 'Info',
    id: { type: 'string' },
    servers: 'ServerMap',
    channels: 'NamedChannels',
    components: 'Components',
    operations: 'NamedOperations',
    defaultContentType: { type: 'string' },
  },
  required: ['asyncapi', 'info'],
};

const Channel: NodeType = {
  properties: {
    address: { type: 'string' },
    messages: 'NamedMessages',
    title: { type: 'string' },
    summary: { type: 'string' },
    description: { type: 'string' },
    servers: 'ServerList',
    parameters: 'ParametersMap',
    bindings: 'ChannelBindings',
    tags: 'TagList',
    externalDocs: 'ExternalDocs',
  },
};

const Server: NodeType = {
  properties: {
    host: { type: 'string' },
    pathname: { type: 'string' },
    protocol: { type: 'string' },
    protocolVersion: { type: 'string' },
    description: { type: 'string' },
    variables: 'ServerVariablesMap',
    security: 'SecuritySchemeList',
    bindings: 'ServerBindings',
    externalDocs: 'ExternalDocs',
    tags: 'TagList',
  },
  required: ['host', 'protocol'],
};

const Info: NodeType = {
  properties: {
    title: { type: 'string' },
    version: { type: 'string' },
    description: { type: 'string' },
    termsOfService: { type: 'string' },
    contact: 'Contact',
    license: 'License',
    tags: 'TagList',
    externalDocs: 'ExternalDocs',
  },
  required: ['title', 'version'],
};

const Parameter: NodeType = {
  properties: {
    description: { type: 'string' },
    enum: { type: 'array', items: { type: 'string' } },
    default: { type: 'string' },
    examples: { type: 'array', items: { type: 'string' } },
    location: { type: 'string' },
  },
};

const Message: NodeType = {
  properties: {
    headers: 'Schema',
    payload: (value: Record<string, unknown>) => {
      if (!!value && value?.['schemaFormat']) {
        return {
          properties: {
            schema: 'Schema',
            schemaFormat: { type: 'string' },
          },
          required: ['schema', 'schemaFormat'],
        };
      } else {
        return 'Schema';
      }
    },
    correlationId: 'CorrelationId',

    contentType: { type: 'string' },
    name: { type: 'string' },
    title: { type: 'string' },
    summary: { type: 'string' },
    description: { type: 'string' },
    tags: 'TagList',
    externalDocs: 'ExternalDocs',
    bindings: 'MessageBindings',
    examples: 'MessageExampleList',
    traits: 'MessageTraitList',
  },
  additionalProperties: {},
};

const OperationTrait: NodeType = {
  properties: {
    tags: 'TagList',
    title: { type: 'string' },
    summary: { type: 'string' },
    description: { type: 'string' },
    externalDocs: 'ExternalDocs',
    security: 'SecuritySchemeList',

    bindings: 'OperationBindings',
  },
  required: [],
};

const MessageTrait: NodeType = {
  properties: {
    headers: (value: unknown) => {
      if (typeof value === 'function' || (typeof value === 'object' && !!value)) {
        return {
          properties: {
            schema: 'Schema',
            schemaFormat: { type: 'string' },
          },
        };
      } else {
        return 'Schema';
      }
    },
    correlationId: 'CorrelationId',

    contentType: { type: 'string' },
    name: { type: 'string' },
    title: { type: 'string' },
    summary: { type: 'string' },
    description: { type: 'string' },
    tags: 'TagList',
    externalDocs: 'ExternalDocs',
    bindings: 'MessageBindings',
    examples: 'MessageExampleList',
  },
  additionalProperties: {},
};

const Operation: NodeType = {
  properties: {
    action: { type: 'string', enum: ['send', 'receive'] },
    channel: 'Channel',
    title: { type: 'string' },
    tags: 'TagList',
    summary: { type: 'string' },
    description: { type: 'string' },
    externalDocs: 'ExternalDocs',
    operationId: { type: 'string' },
    security: 'SecuritySchemeList',

    bindings: 'OperationBindings',
    traits: 'OperationTraitList',
    messages: 'MessageList',
    reply: 'OperationReply',
  },
  required: ['action', 'channel'],
};

const OperationReply: NodeType = {
  properties: {
    channel: 'Channel',
    messages: 'MessageList',
    address: 'OperationReplyAddress',
  },
};

const OperationReplyAddress: NodeType = {
  properties: {
    location: { type: 'string' },
    description: { type: 'string' },
  },
  required: ['location'],
};

const Components: NodeType = {
  properties: {
    messages: 'NamedMessages',
    parameters: 'NamedParameters',
    schemas: 'NamedSchemas',
    replies: 'NamedOperationReplies',
    replyAddresses: 'NamedOperationRelyAddresses',
    correlationIds: 'NamedCorrelationIds',
    messageTraits: 'NamedMessageTraits',
    operationTraits: 'NamedOperationTraits',
    tags: 'NamedTags',
    externalDocs: 'NamedExternalDocs',
    securitySchemes: 'NamedSecuritySchemes',
    servers: 'ServerMap',
    serverVariables: 'ServerVariablesMap',
    channels: 'NamedChannels',
    operations: 'NamedOperations',
    serverBindings: 'ServerBindings',
    channelBindings: 'ChannelBindings',
    operationBindings: 'OperationBindings',
    messageBindings: 'MessageBindings',
  },
};

const ImplicitFlow: NodeType = {
  properties: {
    refreshUrl: { type: 'string' },
    availableScopes: { type: 'object', additionalProperties: { type: 'string' } },
    authorizationUrl: { type: 'string' },
  },
  required: ['authorizationUrl', 'availableScopes'],
};

const PasswordFlow: NodeType = {
  properties: {
    refreshUrl: { type: 'string' },
    availableScopes: { type: 'object', additionalProperties: { type: 'string' } },
    tokenUrl: { type: 'string' },
  },
  required: ['tokenUrl', 'availableScopes'],
};

const ClientCredentials: NodeType = {
  properties: {
    refreshUrl: { type: 'string' },
    availableScopes: { type: 'object', additionalProperties: { type: 'string' } },
    tokenUrl: { type: 'string' },
  },
  required: ['tokenUrl', 'availableScopes'],
};

const AuthorizationCode: NodeType = {
  properties: {
    refreshUrl: { type: 'string' },
    authorizationUrl: { type: 'string' },
    availableScopes: { type: 'object', additionalProperties: { type: 'string' } },
    tokenUrl: { type: 'string' },
  },
  required: ['authorizationUrl', 'tokenUrl', 'availableScopes'],
};

const SecurityScheme: NodeType = {
  properties: {
    type: {
      enum: [
        'userPassword',
        'apiKey',
        'X509',
        'symmetricEncryption',
        'asymmetricEncryption',
        'httpApiKey',
        'http',
        'oauth2',
        'openIdConnect',
        'plain',
        'scramSha256',
        'scramSha512',
        'gssapi',
      ],
    },
    description: { type: 'string' },
    name: { type: 'string' },
    in: { type: 'string', enum: ['query', 'header', 'cookie', 'user', 'password'] },
    scheme: { type: 'string' },
    bearerFormat: { type: 'string' },
    flows: 'SecuritySchemeFlows',
    openIdConnectUrl: { type: 'string' },
    scopes: { type: 'array', items: { type: 'string' } },
  },
  required(value) {
    switch (value?.type) {
      case 'apiKey':
        return ['type', 'in'];
      case 'httpApiKey':
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
        return ['type', 'in', 'description'];
      case 'httpApiKey':
        return ['type', 'name', 'in', 'description'];
      case 'http':
        return ['type', 'scheme', 'bearerFormat', 'description'];
      case 'oauth2':
        return ['type', 'flows', 'description', 'scopes'];
      case 'openIdConnect':
        return ['type', 'openIdConnectUrl', 'description', 'scopes'];
      default:
        return ['type', 'description'];
    }
  },
  extensionsPrefix: 'x-',
};

export const AsyncApi3Types: Record<string, NodeType> = {
  // from asyncapi2
  ...AsyncApi2Bindings,
  CorrelationId,
  SecuritySchemeFlows,
  ServerVariable,
  Contact,
  License,
  MessageExample,
  Tag,
  Dependencies,
  Schema,
  Discriminator,
  DiscriminatorMapping,
  SchemaProperties,
  ServerMap,
  ExternalDocs,
  Root,

  Channel,
  Parameter,
  Info,
  Server,
  MessageTrait,
  Operation,
  OperationReply,
  OperationReplyAddress,
  Components,
  ImplicitFlow,
  PasswordFlow,
  ClientCredentials,
  AuthorizationCode,
  SecurityScheme,
  Message,
  OperationTrait,
  ServerVariablesMap: mapOf('ServerVariable'),
  NamedTags: mapOf('Tag'),
  NamedExternalDocs: mapOf('ExternalDocs'),
  NamedChannels: mapOf('Channel'),
  ParametersMap: mapOf('Parameter'),
  NamedOperations: mapOf('Operation'),
  NamedOperationReplies: mapOf('OperationReply'),
  NamedOperationRelyAddresses: mapOf('OperationReplyAddress'),
  NamedSchemas: mapOf('Schema'),
  NamedMessages: mapOf('Message'),
  NamedMessageTraits: mapOf('MessageTrait'),
  NamedOperationTraits: mapOf('OperationTrait'),
  NamedParameters: mapOf('Parameter'),
  NamedSecuritySchemes: mapOf('SecurityScheme'),
  NamedCorrelationIds: mapOf('CorrelationId'),
  ServerList: listOf('Server'),
  SecuritySchemeList: listOf('SecurityScheme'),
  MessageList: listOf('Message'),
  OperationTraitList: listOf('OperationTrait'),
  MessageTraitList: listOf('MessageTrait'),
  MessageExampleList: listOf('MessageExample'),
  TagList: listOf('Tag'),
};
