"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsyncApi3Types = void 0;
const _1 = require(".");
const asyncapi2_1 = require("./asyncapi2");
const Root = {
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
const Channel = {
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
const Server = {
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
const Info = {
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
const Parameter = {
    properties: {
        description: { type: 'string' },
        enum: { type: 'array', items: { type: 'string' } },
        default: { type: 'string' },
        examples: { type: 'array', items: { type: 'string' } },
        location: { type: 'string' },
    },
};
const Message = {
    properties: {
        headers: 'Schema',
        payload: (value) => {
            if (!!value && value?.['schemaFormat']) {
                return {
                    properties: {
                        schema: 'Schema',
                        schemaFormat: { type: 'string' },
                    },
                    required: ['schema', 'schemaFormat'],
                };
            }
            else {
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
const OperationTrait = {
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
const MessageTrait = {
    properties: {
        headers: (value) => {
            if (typeof value === 'function' || (typeof value === 'object' && !!value)) {
                return {
                    properties: {
                        schema: 'Schema',
                        schemaFormat: { type: 'string' },
                    },
                };
            }
            else {
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
const Operation = {
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
const OperationReply = {
    properties: {
        channel: 'Channel',
        messages: 'MessageList',
        address: 'OperationReplyAddress',
    },
};
const OperationReplyAddress = {
    properties: {
        location: { type: 'string' },
        description: { type: 'string' },
    },
    required: ['location'],
};
const Components = {
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
const ImplicitFlow = {
    properties: {
        refreshUrl: { type: 'string' },
        availableScopes: { type: 'object', additionalProperties: { type: 'string' } },
        authorizationUrl: { type: 'string' },
    },
    required: ['authorizationUrl', 'availableScopes'],
};
const PasswordFlow = {
    properties: {
        refreshUrl: { type: 'string' },
        availableScopes: { type: 'object', additionalProperties: { type: 'string' } },
        tokenUrl: { type: 'string' },
    },
    required: ['tokenUrl', 'availableScopes'],
};
const ClientCredentials = {
    properties: {
        refreshUrl: { type: 'string' },
        availableScopes: { type: 'object', additionalProperties: { type: 'string' } },
        tokenUrl: { type: 'string' },
    },
    required: ['tokenUrl', 'availableScopes'],
};
const AuthorizationCode = {
    properties: {
        refreshUrl: { type: 'string' },
        authorizationUrl: { type: 'string' },
        availableScopes: { type: 'object', additionalProperties: { type: 'string' } },
        tokenUrl: { type: 'string' },
    },
    required: ['authorizationUrl', 'tokenUrl', 'availableScopes'],
};
const SecurityScheme = {
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
exports.AsyncApi3Types = {
    // from asyncapi2
    ...asyncapi2_1.AsyncApi2Bindings,
    CorrelationId: asyncapi2_1.CorrelationId,
    SecuritySchemeFlows: asyncapi2_1.SecuritySchemeFlows,
    ServerVariable: asyncapi2_1.ServerVariable,
    Contact: asyncapi2_1.Contact,
    License: asyncapi2_1.License,
    MessageExample: asyncapi2_1.MessageExample,
    Tag: asyncapi2_1.Tag,
    Dependencies: asyncapi2_1.Dependencies,
    Schema: asyncapi2_1.Schema,
    Discriminator: asyncapi2_1.Discriminator,
    DiscriminatorMapping: asyncapi2_1.DiscriminatorMapping,
    SchemaProperties: asyncapi2_1.SchemaProperties,
    ServerMap: asyncapi2_1.ServerMap,
    ExternalDocs: asyncapi2_1.ExternalDocs,
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
    ServerVariablesMap: (0, _1.mapOf)('ServerVariable'),
    NamedTags: (0, _1.mapOf)('Tag'),
    NamedExternalDocs: (0, _1.mapOf)('ExternalDocs'),
    NamedChannels: (0, _1.mapOf)('Channel'),
    ParametersMap: (0, _1.mapOf)('Parameter'),
    NamedOperations: (0, _1.mapOf)('Operation'),
    NamedOperationReplies: (0, _1.mapOf)('OperationReply'),
    NamedOperationRelyAddresses: (0, _1.mapOf)('OperationReplyAddress'),
    NamedSchemas: (0, _1.mapOf)('Schema'),
    NamedMessages: (0, _1.mapOf)('Message'),
    NamedMessageTraits: (0, _1.mapOf)('MessageTrait'),
    NamedOperationTraits: (0, _1.mapOf)('OperationTrait'),
    NamedParameters: (0, _1.mapOf)('Parameter'),
    NamedSecuritySchemes: (0, _1.mapOf)('SecurityScheme'),
    NamedCorrelationIds: (0, _1.mapOf)('CorrelationId'),
    ServerList: (0, _1.listOf)('Server'),
    SecuritySchemeList: (0, _1.listOf)('SecurityScheme'),
    MessageList: (0, _1.listOf)('Message'),
    OperationTraitList: (0, _1.listOf)('OperationTrait'),
    MessageTraitList: (0, _1.listOf)('MessageTrait'),
    MessageExampleList: (0, _1.listOf)('MessageExample'),
    TagList: (0, _1.listOf)('Tag'),
};
