"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Oas3Types = exports.Discriminator = exports.DiscriminatorMapping = exports.Xml = exports.ExternalDocs = void 0;
const _1 = require(".");
const ref_utils_1 = require("../ref-utils");
const responseCodeRegexp = /^[0-9][0-9Xx]{2}$/;
const Root = {
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
const Tag = {
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
const TagGroup = {
    properties: {
        name: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
    },
    extensionsPrefix: 'x-',
};
exports.ExternalDocs = {
    properties: {
        description: { type: 'string' },
        url: { type: 'string' },
    },
    required: ['url'],
    extensionsPrefix: 'x-',
};
const Server = {
    properties: {
        url: { type: 'string' },
        description: { type: 'string' },
        variables: 'ServerVariablesMap',
    },
    required: ['url'],
    extensionsPrefix: 'x-',
};
const ServerVariable = {
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
const SecurityRequirement = {
    properties: {},
    additionalProperties: { type: 'array', items: { type: 'string' } },
};
const Info = {
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
const Logo = {
    properties: {
        url: { type: 'string' },
        altText: { type: 'string' },
        backgroundColor: { type: 'string' },
        href: { type: 'string' },
    },
};
const Contact = {
    properties: {
        name: { type: 'string' },
        url: { type: 'string' },
        email: { type: 'string' },
    },
    extensionsPrefix: 'x-',
};
const License = {
    properties: {
        name: { type: 'string' },
        url: { type: 'string' },
    },
    required: ['name'],
    extensionsPrefix: 'x-',
};
const Paths = {
    properties: {},
    additionalProperties: (_value, key) => key.startsWith('/') ? 'PathItem' : undefined,
};
const WebhooksMap = {
    properties: {},
    additionalProperties: () => 'PathItem',
};
const PathItem = {
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
const Parameter = {
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
const Operation = {
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
const XCodeSample = {
    properties: {
        lang: { type: 'string' },
        label: { type: 'string' },
        source: { type: 'string' },
    },
};
const RequestBody = {
    properties: {
        description: { type: 'string' },
        required: { type: 'boolean' },
        content: 'MediaTypesMap',
    },
    required: ['content'],
    extensionsPrefix: 'x-',
};
const MediaTypesMap = {
    properties: {},
    additionalProperties: 'MediaType',
};
const MediaType = {
    properties: {
        schema: 'Schema',
        example: { isExample: true },
        examples: 'ExamplesMap',
        encoding: 'EncodingMap',
    },
    extensionsPrefix: 'x-',
};
const Example = {
    properties: {
        value: { isExample: true },
        summary: { type: 'string' },
        description: { type: 'string' },
        externalValue: { type: 'string' },
    },
    extensionsPrefix: 'x-',
};
const Encoding = {
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
const EnumDescriptions = {
    properties: {},
    additionalProperties: { type: 'string' },
};
const Header = {
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
const Responses = {
    properties: { default: 'Response' },
    additionalProperties: (_v, key) => responseCodeRegexp.test(key) ? 'Response' : undefined,
};
const Response = {
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
const Link = {
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
const Schema = {
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
        allOf: (0, _1.listOf)('Schema'),
        anyOf: (0, _1.listOf)('Schema'),
        oneOf: (0, _1.listOf)('Schema'),
        not: 'Schema',
        properties: 'SchemaProperties',
        items: (value) => {
            if (Array.isArray(value)) {
                return (0, _1.listOf)('Schema');
            }
            else {
                return 'Schema';
            }
        },
        additionalProperties: (value) => {
            if (typeof value === 'boolean') {
                return { type: 'boolean' };
            }
            else {
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
exports.Xml = {
    properties: {
        name: { type: 'string' },
        namespace: { type: 'string' },
        prefix: { type: 'string' },
        attribute: { type: 'boolean' },
        wrapped: { type: 'boolean' },
    },
    extensionsPrefix: 'x-',
};
const SchemaProperties = {
    properties: {},
    additionalProperties: 'Schema',
};
exports.DiscriminatorMapping = {
    properties: {},
    additionalProperties: (value) => {
        if ((0, ref_utils_1.isMappingRef)(value)) {
            return { type: 'string', directResolveAs: 'Schema' };
        }
        else {
            return { type: 'string' };
        }
    },
};
exports.Discriminator = {
    properties: {
        propertyName: { type: 'string' },
        mapping: 'DiscriminatorMapping',
    },
    required: ['propertyName'],
    extensionsPrefix: 'x-',
};
const Components = {
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
const ImplicitFlow = {
    properties: {
        refreshUrl: { type: 'string' },
        scopes: { type: 'object', additionalProperties: { type: 'string' } }, // TODO: validate scopes
        authorizationUrl: { type: 'string' },
    },
    required: ['authorizationUrl', 'scopes'],
    extensionsPrefix: 'x-',
};
const PasswordFlow = {
    properties: {
        refreshUrl: { type: 'string' },
        scopes: { type: 'object', additionalProperties: { type: 'string' } }, // TODO: validate scopes
        tokenUrl: { type: 'string' },
    },
    required: ['tokenUrl', 'scopes'],
    extensionsPrefix: 'x-',
};
const ClientCredentials = {
    properties: {
        refreshUrl: { type: 'string' },
        scopes: { type: 'object', additionalProperties: { type: 'string' } }, // TODO: validate scopes
        tokenUrl: { type: 'string' },
    },
    required: ['tokenUrl', 'scopes'],
    extensionsPrefix: 'x-',
};
const AuthorizationCode = {
    properties: {
        refreshUrl: { type: 'string' },
        authorizationUrl: { type: 'string' },
        scopes: { type: 'object', additionalProperties: { type: 'string' } }, // TODO: validate scopes
        tokenUrl: { type: 'string' },
        'x-usePkce': (value) => {
            if (typeof value === 'boolean') {
                return { type: 'boolean' };
            }
            else {
                return 'XUsePkce';
            }
        },
    },
    required: ['authorizationUrl', 'tokenUrl', 'scopes'],
    extensionsPrefix: 'x-',
};
const OAuth2Flows = {
    properties: {
        implicit: 'ImplicitFlow',
        password: 'PasswordFlow',
        clientCredentials: 'ClientCredentials',
        authorizationCode: 'AuthorizationCode',
    },
    extensionsPrefix: 'x-',
};
const SecurityScheme = {
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
const XUsePkce = {
    properties: {
        disableManualConfiguration: { type: 'boolean' },
        hideClientSecretInput: { type: 'boolean' },
    },
};
exports.Oas3Types = {
    Root,
    Tag,
    TagList: (0, _1.listOf)('Tag'),
    TagGroups: (0, _1.listOf)('TagGroup'),
    TagGroup,
    ExternalDocs: exports.ExternalDocs,
    Server,
    ServerList: (0, _1.listOf)('Server'),
    ServerVariable,
    ServerVariablesMap: (0, _1.mapOf)('ServerVariable'),
    SecurityRequirement,
    SecurityRequirementList: (0, _1.listOf)('SecurityRequirement'),
    Info,
    Contact,
    License,
    Paths,
    PathItem,
    Parameter,
    ParameterList: (0, _1.listOf)('Parameter'),
    Operation,
    Callback: (0, _1.mapOf)('PathItem'),
    CallbacksMap: (0, _1.mapOf)('Callback'),
    RequestBody,
    MediaTypesMap,
    MediaType,
    Example,
    ExamplesMap: (0, _1.mapOf)('Example'),
    Encoding,
    EncodingMap: (0, _1.mapOf)('Encoding'),
    EnumDescriptions,
    Header,
    HeadersMap: (0, _1.mapOf)('Header'),
    Responses,
    Response,
    Link,
    Logo,
    Schema,
    Xml: exports.Xml,
    SchemaProperties,
    DiscriminatorMapping: exports.DiscriminatorMapping,
    Discriminator: exports.Discriminator,
    Components,
    LinksMap: (0, _1.mapOf)('Link'),
    NamedSchemas: (0, _1.mapOf)('Schema'),
    NamedResponses: (0, _1.mapOf)('Response'),
    NamedParameters: (0, _1.mapOf)('Parameter'),
    NamedExamples: (0, _1.mapOf)('Example'),
    NamedRequestBodies: (0, _1.mapOf)('RequestBody'),
    NamedHeaders: (0, _1.mapOf)('Header'),
    NamedSecuritySchemes: (0, _1.mapOf)('SecurityScheme'),
    NamedLinks: (0, _1.mapOf)('Link'),
    NamedCallbacks: (0, _1.mapOf)('Callback'),
    ImplicitFlow,
    PasswordFlow,
    ClientCredentials,
    AuthorizationCode,
    OAuth2Flows,
    SecurityScheme,
    XCodeSample,
    XCodeSampleList: (0, _1.listOf)('XCodeSample'),
    XUsePkce,
    WebhooksMap,
};
