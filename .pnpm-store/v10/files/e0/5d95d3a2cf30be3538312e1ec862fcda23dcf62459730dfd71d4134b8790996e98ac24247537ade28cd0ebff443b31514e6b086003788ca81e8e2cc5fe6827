"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsyncApi2Types = exports.AsyncApi2Bindings = exports.Dependencies = exports.SecuritySchemeFlows = exports.Discriminator = exports.DiscriminatorMapping = exports.SchemaProperties = exports.Schema = exports.MessageExample = exports.CorrelationId = exports.License = exports.Contact = exports.ServerVariable = exports.ServerMap = exports.ExternalDocs = exports.Tag = void 0;
const _1 = require(".");
const ref_utils_1 = require("../ref-utils");
const Root = {
    properties: {
        asyncapi: null, // TODO: validate semver format and supported version
        info: 'Info',
        id: { type: 'string' },
        servers: 'ServerMap',
        channels: 'ChannelMap',
        components: 'Components',
        tags: 'TagList',
        externalDocs: 'ExternalDocs',
        defaultContentType: { type: 'string' },
    },
    required: ['asyncapi', 'channels', 'info'],
};
const Channel = {
    properties: {
        description: { type: 'string' },
        subscribe: 'Operation',
        publish: 'Operation',
        parameters: 'ParametersMap',
        bindings: 'ChannelBindings',
        servers: { type: 'array', items: { type: 'string' } },
    },
};
const ChannelMap = {
    properties: {},
    additionalProperties: 'Channel',
};
const ChannelBindings = {
    properties: {},
    allowed() {
        // allow all supported values, not all have deep linting
        return [
            'http',
            'ws',
            'kafka',
            'anypointmq',
            'amqp',
            'amqp1',
            'mqtt',
            'mqtt5',
            'nats',
            'jms',
            'sns',
            'solace',
            'sqs',
            'stomp',
            'redis',
            'mercure',
            'ibmmq',
            'googlepubsub',
            'pulsar',
        ];
    },
    additionalProperties: { type: 'object' },
};
exports.Tag = {
    properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        externalDocs: 'ExternalDocs',
    },
    required: ['name'],
};
exports.ExternalDocs = {
    properties: {
        description: { type: 'string' },
        url: { type: 'string' },
    },
    required: ['url'],
};
const SecurityRequirement = {
    properties: {},
    additionalProperties: { type: 'array', items: { type: 'string' } },
};
const ServerBindings = {
    properties: {},
    allowed() {
        // allow all supported values, not all have deep linting
        return [
            'http',
            'ws',
            'kafka',
            'anypointmq',
            'amqp',
            'amqp1',
            'mqtt',
            'mqtt5',
            'nats',
            'jms',
            'sns',
            'solace',
            'sqs',
            'stomp',
            'redis',
            'mercure',
            'ibmmq',
            'googlepubsub',
            'pulsar',
        ];
    },
    additionalProperties: { type: 'object' },
};
const Server = {
    properties: {
        url: { type: 'string' },
        protocol: { type: 'string' },
        protocolVersion: { type: 'string' },
        description: { type: 'string' },
        variables: 'ServerVariablesMap',
        security: 'SecurityRequirementList',
        bindings: 'ServerBindings',
        tags: 'TagList',
    },
    required: ['url', 'protocol'],
};
exports.ServerMap = {
    properties: {},
    additionalProperties: (_value, key) => 
    // eslint-disable-next-line no-useless-escape
    key.match(/^[A-Za-z0-9_\-]+$/) ? 'Server' : undefined,
};
exports.ServerVariable = {
    properties: {
        enum: {
            type: 'array',
            items: { type: 'string' },
        },
        default: { type: 'string' },
        description: { type: 'string' },
        examples: {
            type: 'array',
            items: { type: 'string' },
        },
    },
    required: [],
};
const Info = {
    properties: {
        title: { type: 'string' },
        version: { type: 'string' },
        description: { type: 'string' },
        termsOfService: { type: 'string' },
        contact: 'Contact',
        license: 'License',
    },
    required: ['title', 'version'],
};
exports.Contact = {
    properties: {
        name: { type: 'string' },
        url: { type: 'string' },
        email: { type: 'string' },
    },
};
exports.License = {
    properties: {
        name: { type: 'string' },
        url: { type: 'string' },
    },
    required: ['name'],
};
const Parameter = {
    properties: {
        description: { type: 'string' },
        schema: 'Schema',
        location: { type: 'string' },
    },
};
exports.CorrelationId = {
    properties: {
        description: { type: 'string' },
        location: { type: 'string' },
    },
    required: ['location'],
};
const Message = {
    properties: {
        messageId: { type: 'string' },
        headers: 'Schema',
        payload: 'Schema', // TODO: strictly this does not cover all cases
        correlationId: 'CorrelationId',
        schemaFormat: { type: 'string' }, // TODO: support official list of schema formats and custom values
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
const MessageBindings = {
    properties: {},
    allowed() {
        // allow all supported values, not all have deep linting
        return [
            'http',
            'ws',
            'kafka',
            'anypointmq',
            'amqp',
            'amqp1',
            'mqtt',
            'mqtt5',
            'nats',
            'jms',
            'sns',
            'solace',
            'sqs',
            'stomp',
            'redis',
            'mercure',
            'ibmmq',
            'googlepubsub',
            'pulsar',
        ];
    },
    additionalProperties: { type: 'object' },
};
const OperationBindings = {
    properties: {},
    allowed() {
        // allow all supported values, not all have deep linting
        return [
            'http',
            'ws',
            'kafka',
            'anypointmq',
            'amqp',
            'amqp1',
            'mqtt',
            'mqtt5',
            'nats',
            'jms',
            'sns',
            'solace',
            'sqs',
            'stomp',
            'redis',
            'mercure',
            'ibmmq',
            'googlepubsub',
            'pulsar',
        ];
    },
    additionalProperties: { type: 'object' },
};
const OperationTrait = {
    properties: {
        tags: 'TagList',
        summary: { type: 'string' },
        description: { type: 'string' },
        externalDocs: 'ExternalDocs',
        operationId: { type: 'string' },
        security: 'SecurityRequirementList',
        bindings: 'OperationBindings',
    },
    required: [],
};
const MessageTrait = {
    properties: {
        messageId: { type: 'string' },
        headers: 'Schema',
        correlationId: 'CorrelationId',
        schemaFormat: { type: 'string' },
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
        tags: 'TagList',
        summary: { type: 'string' },
        description: { type: 'string' },
        externalDocs: 'ExternalDocs',
        operationId: { type: 'string' },
        security: 'SecurityRequirementList',
        bindings: 'OperationBindings',
        traits: 'OperationTraitList',
        message: 'Message',
    },
    required: [],
};
exports.MessageExample = {
    properties: {
        payload: { isExample: true },
        summary: { type: 'string' },
        name: { type: 'string' },
        headers: { type: 'object' },
    },
};
exports.Schema = {
    properties: {
        $id: { type: 'string' },
        $schema: { type: 'string' },
        definitions: 'NamedSchemas',
        externalDocs: 'ExternalDocs',
        discriminator: 'Discriminator',
        myArbitraryKeyword: { type: 'boolean' },
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
        type: (value) => {
            return Array.isArray(value)
                ? {
                    type: 'array',
                    items: { enum: ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'] },
                }
                : {
                    enum: ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'],
                };
        },
        allOf: (0, _1.listOf)('Schema'),
        anyOf: (0, _1.listOf)('Schema'),
        oneOf: (0, _1.listOf)('Schema'),
        not: 'Schema',
        if: 'Schema',
        then: 'Schema',
        else: 'Schema',
        contains: 'Schema',
        patternProperties: { type: 'object' },
        propertyNames: 'Schema',
        properties: 'SchemaProperties',
        items: (value) => {
            return Array.isArray(value) ? (0, _1.listOf)('Schema') : 'Schema';
        },
        additionalProperties: (value) => {
            return typeof value === 'boolean' ? { type: 'boolean' } : 'Schema';
        },
        description: { type: 'string' },
        format: { type: 'string' },
        contentEncoding: { type: 'string' },
        contentMediaType: { type: 'string' },
        default: null,
        readOnly: { type: 'boolean' },
        writeOnly: { type: 'boolean' },
        examples: { type: 'array' },
        example: { isExample: true },
        deprecated: { type: 'boolean' },
        const: null,
        $comment: { type: 'string' },
        additionalItems: (value) => {
            return typeof value === 'boolean' ? { type: 'boolean' } : 'Schema';
        },
        dependencies: 'Dependencies',
    },
};
exports.SchemaProperties = {
    properties: {},
    additionalProperties: (value) => {
        return typeof value === 'boolean' ? { type: 'boolean' } : 'Schema';
    },
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
};
const Components = {
    properties: {
        messages: 'NamedMessages',
        parameters: 'NamedParameters',
        schemas: 'NamedSchemas',
        correlationIds: 'NamedCorrelationIds',
        messageTraits: 'NamedMessageTraits',
        operationTraits: 'NamedOperationTraits',
        securitySchemes: 'NamedSecuritySchemes',
        servers: 'ServerMap',
        serverVariables: 'ServerVariablesMap',
        channels: 'ChannelMap',
        serverBindings: 'ServerBindings',
        channelBindings: 'ChannelBindings',
        operationBindings: 'OperationBindings',
        messageBindings: 'MessageBindings',
    },
};
const ImplicitFlow = {
    properties: {
        refreshUrl: { type: 'string' },
        scopes: { type: 'object', additionalProperties: { type: 'string' } }, // TODO: validate scopes
        authorizationUrl: { type: 'string' },
    },
    required: ['authorizationUrl', 'scopes'],
};
const PasswordFlow = {
    properties: {
        refreshUrl: { type: 'string' },
        scopes: { type: 'object', additionalProperties: { type: 'string' } }, // TODO: validate scopes
        tokenUrl: { type: 'string' },
    },
    required: ['tokenUrl', 'scopes'],
};
const ClientCredentials = {
    properties: {
        refreshUrl: { type: 'string' },
        scopes: { type: 'object', additionalProperties: { type: 'string' } }, // TODO: validate scopes
        tokenUrl: { type: 'string' },
    },
    required: ['tokenUrl', 'scopes'],
};
const AuthorizationCode = {
    properties: {
        refreshUrl: { type: 'string' },
        authorizationUrl: { type: 'string' },
        scopes: { type: 'object', additionalProperties: { type: 'string' } }, // TODO: validate scopes
        tokenUrl: { type: 'string' },
    },
    required: ['authorizationUrl', 'tokenUrl', 'scopes'],
};
exports.SecuritySchemeFlows = {
    properties: {
        implicit: 'ImplicitFlow',
        password: 'PasswordFlow',
        clientCredentials: 'ClientCredentials',
        authorizationCode: 'AuthorizationCode',
    },
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
                return ['type', 'flows', 'description'];
            case 'openIdConnect':
                return ['type', 'openIdConnectUrl', 'description'];
            default:
                return ['type', 'description'];
        }
    },
    extensionsPrefix: 'x-',
};
exports.Dependencies = {
    properties: {},
    additionalProperties: (value) => {
        return Array.isArray(value) ? { type: 'array', items: { type: 'string' } } : 'Schema';
    },
};
// --- Per-protocol node types
// http
const HttpChannelBinding = {
    properties: {}, // empty object
};
ChannelBindings.properties.http = HttpChannelBinding;
const HttpServerBinding = {
    properties: {}, // empty object
};
ServerBindings.properties.http = HttpServerBinding;
const HttpMessageBinding = {
    properties: {
        headers: 'Schema',
        bindingVersion: { type: 'string' },
    },
};
MessageBindings.properties.http = HttpMessageBinding;
const HttpOperationBinding = {
    properties: {
        type: { type: 'string' },
        method: {
            type: 'string',
            enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE'],
        },
        headers: 'Schema',
        bindingVersion: { type: 'string' },
    },
};
OperationBindings.properties.http = HttpOperationBinding;
// ws
const WsChannelBinding = {
    properties: {
        method: { type: 'string' },
        query: 'Schema',
        headers: 'Schema',
        bindingVersion: { type: 'string' },
    },
};
ChannelBindings.properties.ws = WsChannelBinding;
const WsServerBinding = {
    properties: {}, // empty object
};
ServerBindings.properties.ws = WsServerBinding;
const WsMessageBinding = {
    properties: {}, // empty object
};
MessageBindings.properties.ws = WsMessageBinding;
const WsOperationBinding = {
    properties: {}, // empty object
};
OperationBindings.properties.ws = WsOperationBinding;
// kafka
const KafkaTopicConfiguration = {
    properties: {
        'cleanup.policy': { type: 'array', items: { enum: ['delete', 'compact'] } },
        'retention.ms': { type: 'integer' },
        'retention.bytes': { type: 'integer' },
        'delete.retention.ms': { type: 'integer' },
        'max.message.bytes': { type: 'integer' },
    },
};
const KafkaChannelBinding = {
    properties: {
        topic: { type: 'string' },
        partitions: { type: 'integer' },
        replicas: { type: 'integer' },
        topicConfiguration: 'KafkaTopicConfiguration',
        bindingVersion: { type: 'string' },
    },
};
ChannelBindings.properties.kafka = KafkaChannelBinding;
const KafkaServerBinding = {
    properties: {}, // empty object
};
ServerBindings.properties.kafka = KafkaServerBinding;
const KafkaMessageBinding = {
    properties: {
        key: 'Schema', // TODO: add avro support
        schemaIdLocation: { type: 'string' },
        schemaIdPayloadEncoding: { type: 'string' },
        schemaLookupStrategy: { type: 'string' },
        bindingVersion: { type: 'string' },
    },
};
MessageBindings.properties.kafka = KafkaMessageBinding;
const KafkaOperationBinding = {
    properties: {
        groupId: 'Schema',
        clientId: 'Schema',
        bindingVersion: { type: 'string' },
    },
};
OperationBindings.properties.kafka = KafkaOperationBinding;
// anypointmq
const AnypointmqChannelBinding = {
    properties: {
        destination: { type: 'string' },
        destinationType: { type: 'string' },
        bindingVersion: { type: 'string' },
    },
};
ChannelBindings.properties.anypointmq = AnypointmqChannelBinding;
const AnypointmqServerBinding = {
    properties: {}, // empty object
};
ServerBindings.properties.anypointmq = AnypointmqServerBinding;
const AnypointmqMessageBinding = {
    properties: {
        headers: 'Schema',
        bindingVersion: { type: 'string' },
    },
};
MessageBindings.properties.anypointmq = AnypointmqMessageBinding;
const AnypointmqOperationBinding = {
    properties: {}, // empty object
};
OperationBindings.properties.anypointmq = AnypointmqOperationBinding;
// amqp
const AmqpChannelBinding = {
    properties: {}, // empty object
};
ChannelBindings.properties.amqp = AmqpChannelBinding;
const AmqpServerBinding = {
    properties: {}, // empty object
};
ServerBindings.properties.amqp = AmqpServerBinding;
const AmqpMessageBinding = {
    properties: {
        contentEncoding: { type: 'string' },
        messageType: { type: 'string' },
        bindingVersion: { type: 'string' },
    },
};
MessageBindings.properties.amqp = AmqpMessageBinding;
const AmqpOperationBinding = {
    // TODO: some fields are subscribe only
    properties: {
        expiration: { type: 'integer' },
        userId: { type: 'string' },
        cc: { type: 'array', items: { type: 'string' } },
        priority: { type: 'integer' },
        deliveryMode: { type: 'integer' }, // TODO: enum: [1, 2]
        mandatory: { type: 'boolean' },
        bcc: { type: 'array', items: { type: 'string' } },
        replyTo: { type: 'string' },
        timestamp: { type: 'boolean' },
        ack: { type: 'boolean' },
        bindingVersion: { type: 'string' },
    },
};
OperationBindings.properties.amqp = AmqpOperationBinding;
// amqp1
const Amqp1ChannelBinding = {
    properties: {}, // empty object
};
ChannelBindings.properties.amqp1 = Amqp1ChannelBinding;
const Amqp1ServerBinding = {
    properties: {}, // empty object
};
ServerBindings.properties.amqp1 = Amqp1ServerBinding;
const Amqp1MessageBinding = {
    properties: {}, // empty object
};
MessageBindings.properties.amqp1 = Amqp1MessageBinding;
const Amqp1OperationBinding = {
    properties: {}, // empty object
};
OperationBindings.properties.amqp1 = Amqp1OperationBinding;
// mqtt
const MqttChannelBinding = {
    properties: {
        qos: { type: 'integer' },
        retain: { type: 'boolean' },
        bindingVersion: { type: 'string' },
    },
};
ChannelBindings.properties.mqtt = MqttChannelBinding;
const MqttServerBindingLastWill = {
    properties: {
        topic: { type: 'string' },
        qos: { type: 'integer' },
        message: { type: 'string' },
        retain: { type: 'boolean' },
    },
};
const MqttServerBinding = {
    properties: {
        clientId: { type: 'string' },
        cleanSession: { type: 'boolean' },
        lastWill: 'MqttServerBindingLastWill',
        keepAlive: { type: 'integer' },
        bindingVersion: { type: 'string' },
    },
};
ServerBindings.properties.mqtt = MqttServerBinding;
const MqttMessageBinding = {
    properties: {
        bindingVersion: { type: 'string' },
    },
};
MessageBindings.properties.mqtt = MqttMessageBinding;
const MqttOperationBinding = {
    properties: {
        qos: { type: 'integer' },
        retain: { type: 'boolean' },
        bindingVersion: { type: 'string' },
    },
};
OperationBindings.properties.mqtt = MqttOperationBinding;
// mqtt5
const Mqtt5ChannelBinding = {
    properties: {}, // empty object
};
ChannelBindings.properties.mqtt5 = Mqtt5ChannelBinding;
const Mqtt5ServerBinding = {
    properties: {}, // empty object
};
ServerBindings.properties.mqtt5 = Mqtt5ServerBinding;
const Mqtt5MessageBinding = {
    properties: {}, // empty object
};
MessageBindings.properties.mqtt5 = Mqtt5MessageBinding;
const Mqtt5OperationBinding = {
    properties: {}, // empty object
};
OperationBindings.properties.mqtt5 = Mqtt5OperationBinding;
// nats
const NatsChannelBinding = {
    properties: {}, // empty object
};
ChannelBindings.properties.nats = NatsChannelBinding;
const NatsServerBinding = {
    properties: {}, // empty object
};
ServerBindings.properties.nats = NatsServerBinding;
const NatsMessageBinding = {
    properties: {}, // empty object
};
MessageBindings.properties.nats = NatsMessageBinding;
const NatsOperationBinding = {
    properties: {
        queue: { type: 'string' },
        bindingVersion: { type: 'string' },
    },
};
OperationBindings.properties.nats = NatsOperationBinding;
// jms
const JmsChannelBinding = {
    properties: {
        destination: { type: 'string' },
        destinationType: { type: 'string' },
        bindingVersion: { type: 'string' },
    },
};
ChannelBindings.properties.jms = JmsChannelBinding;
const JmsServerBinding = {
    properties: {}, // empty object
};
ServerBindings.properties.jms = JmsServerBinding;
const JmsMessageBinding = {
    properties: {
        headers: 'Schema',
        bindingVersion: { type: 'string' },
    },
};
MessageBindings.properties.jms = JmsMessageBinding;
const JmsOperationBinding = {
    properties: {
        headers: 'Schema',
        bindingVersion: { type: 'string' },
    },
};
OperationBindings.properties.jms = JmsOperationBinding;
// sns
// solace
const SolaceChannelBinding = {
    properties: {}, // empty object
};
ChannelBindings.properties.solace = SolaceChannelBinding;
const SolaceServerBinding = {
    properties: {
        bindingVersion: { type: 'string' },
        msgVpn: { type: 'string' },
    },
};
ServerBindings.properties.solace = SolaceServerBinding;
const SolaceMessageBinding = {
    properties: {}, // empty object
};
MessageBindings.properties.solace = SolaceMessageBinding;
const SolaceDestination = {
    properties: {
        destinationType: { type: 'string', enum: ['queue', 'topic'] },
        deliveryMode: { type: 'string', enum: ['direct', 'persistent'] },
        'queue.name': { type: 'string' },
        'queue.topicSubscriptions': { type: 'array', items: { type: 'string' } },
        'queue.accessType': { type: 'string', enum: ['exclusive', 'nonexclusive'] },
        'queue.maxMsgSpoolSize': { type: 'string' },
        'queue.maxTtl': { type: 'string' },
        'topic.topicSubscriptions': { type: 'array', items: { type: 'string' } },
    },
};
const SolaceOperationBinding = {
    properties: {
        bindingVersion: { type: 'string' },
        destinations: (0, _1.listOf)('SolaceDestination'),
    },
};
OperationBindings.properties.solace = SolaceOperationBinding;
// sqs
// stomp
const StompChannelBinding = {
    properties: {}, // empty object
};
ChannelBindings.properties.stomp = StompChannelBinding;
const StompServerBinding = {
    properties: {}, // empty object
};
ServerBindings.properties.stomp = StompServerBinding;
const StompMessageBinding = {
    properties: {}, // empty object
};
MessageBindings.properties.stomp = StompMessageBinding;
const StompOperationBinding = {
    properties: {}, // empty object
};
OperationBindings.properties.stomp = StompOperationBinding;
// redis
const RedisChannelBinding = {
    properties: {}, // empty object
};
ChannelBindings.properties.redis = RedisChannelBinding;
const RedisServerBinding = {
    properties: {}, // empty object
};
ServerBindings.properties.redis = RedisServerBinding;
const RedisMessageBinding = {
    properties: {}, // empty object
};
MessageBindings.properties.redis = RedisMessageBinding;
const RedisOperationBinding = {
    properties: {}, // empty object
};
OperationBindings.properties.redis = RedisOperationBinding;
// mercure
const MercureChannelBinding = {
    properties: {}, // empty object
};
ChannelBindings.properties.mercure = MercureChannelBinding;
const MercureServerBinding = {
    properties: {}, // empty object
};
ServerBindings.properties.mercure = MercureServerBinding;
const MercureMessageBinding = {
    properties: {}, // empty object
};
MessageBindings.properties.mercure = MercureMessageBinding;
const MercureOperationBinding = {
    properties: {}, // empty object
};
OperationBindings.properties.mercure = MercureOperationBinding;
// ibmmq
// googlepubsub
// pulsar
// --- End per-protocol node types
exports.AsyncApi2Bindings = {
    HttpServerBinding,
    HttpChannelBinding,
    HttpMessageBinding,
    HttpOperationBinding,
    WsServerBinding,
    WsChannelBinding,
    WsMessageBinding,
    WsOperationBinding,
    KafkaServerBinding,
    KafkaTopicConfiguration,
    KafkaChannelBinding,
    KafkaMessageBinding,
    KafkaOperationBinding,
    AnypointmqServerBinding,
    AnypointmqChannelBinding,
    AnypointmqMessageBinding,
    AnypointmqOperationBinding,
    AmqpServerBinding,
    AmqpChannelBinding,
    AmqpMessageBinding,
    AmqpOperationBinding,
    Amqp1ServerBinding,
    Amqp1ChannelBinding,
    Amqp1MessageBinding,
    Amqp1OperationBinding,
    MqttServerBindingLastWill,
    MqttServerBinding,
    MqttChannelBinding,
    MqttMessageBinding,
    MqttOperationBinding,
    Mqtt5ServerBinding,
    Mqtt5ChannelBinding,
    Mqtt5MessageBinding,
    Mqtt5OperationBinding,
    NatsServerBinding,
    NatsChannelBinding,
    NatsMessageBinding,
    NatsOperationBinding,
    JmsServerBinding,
    JmsChannelBinding,
    JmsMessageBinding,
    JmsOperationBinding,
    SolaceServerBinding,
    SolaceChannelBinding,
    SolaceMessageBinding,
    SolaceDestination,
    SolaceOperationBinding,
    StompServerBinding,
    StompChannelBinding,
    StompMessageBinding,
    StompOperationBinding,
    RedisServerBinding,
    RedisChannelBinding,
    RedisMessageBinding,
    RedisOperationBinding,
    MercureServerBinding,
    MercureChannelBinding,
    MercureMessageBinding,
    MercureOperationBinding,
    ServerBindings,
    ChannelBindings,
    MessageBindings,
    OperationBindings,
};
exports.AsyncApi2Types = {
    ...exports.AsyncApi2Bindings,
    Root,
    Tag: exports.Tag,
    TagList: (0, _1.listOf)('Tag'),
    ServerMap: exports.ServerMap,
    ExternalDocs: exports.ExternalDocs,
    Server,
    ServerVariable: exports.ServerVariable,
    ServerVariablesMap: (0, _1.mapOf)('ServerVariable'),
    SecurityRequirement,
    SecurityRequirementList: (0, _1.listOf)('SecurityRequirement'),
    Info,
    Contact: exports.Contact,
    License: exports.License,
    ChannelMap,
    Channel,
    Parameter,
    ParametersMap: (0, _1.mapOf)('Parameter'),
    Operation,
    Schema: exports.Schema,
    MessageExample: exports.MessageExample,
    SchemaProperties: exports.SchemaProperties,
    DiscriminatorMapping: exports.DiscriminatorMapping,
    Discriminator: exports.Discriminator,
    Components,
    NamedSchemas: (0, _1.mapOf)('Schema'),
    NamedMessages: (0, _1.mapOf)('Message'),
    NamedMessageTraits: (0, _1.mapOf)('MessageTrait'),
    NamedOperationTraits: (0, _1.mapOf)('OperationTrait'),
    NamedParameters: (0, _1.mapOf)('Parameter'),
    NamedSecuritySchemes: (0, _1.mapOf)('SecurityScheme'),
    NamedCorrelationIds: (0, _1.mapOf)('CorrelationId'),
    ImplicitFlow,
    PasswordFlow,
    ClientCredentials,
    AuthorizationCode,
    SecuritySchemeFlows: exports.SecuritySchemeFlows,
    SecurityScheme,
    Message,
    MessageBindings,
    OperationBindings,
    OperationTrait,
    OperationTraitList: (0, _1.listOf)('OperationTrait'),
    MessageTrait,
    MessageTraitList: (0, _1.listOf)('MessageTrait'),
    MessageExampleList: (0, _1.listOf)('MessageExample'),
    CorrelationId: exports.CorrelationId,
    Dependencies: exports.Dependencies,
};
