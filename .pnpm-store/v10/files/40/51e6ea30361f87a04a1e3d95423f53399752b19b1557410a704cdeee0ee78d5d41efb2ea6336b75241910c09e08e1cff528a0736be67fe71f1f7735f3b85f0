"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.thirdDocument = exports.secondDocument = exports.firstDocument = void 0;
exports.firstDocument = {
    openapi: '3.0.0',
    servers: [{ url: 'http://localhost:8080' }],
    info: {
        description: 'example test',
        version: '1.0.0',
        title: 'First API',
        termsOfService: 'http://swagger.io/terms/',
        license: {
            name: 'Apache 2.0',
            url: 'http://www.apache.org/licenses/LICENSE-2.0.html',
        },
    },
    paths: {
        '/GETUser/{userId}': {
            summary: 'get user by id',
            description: 'user info',
            servers: [{ url: '/user' }, { url: '/pet', description: 'pet server' }],
            get: {
                tags: ['pet'],
                summary: 'Find pet by ID',
                description: 'Returns a single pet',
                operationId: 'getPetById',
                servers: [{ url: '/pet' }],
            },
            parameters: [{ name: 'param1', in: 'header', schema: { description: 'string' } }],
        },
    },
    components: {},
};
exports.secondDocument = {
    openapi: '3.0.0',
    servers: [{ url: 'http://localhost:8080' }],
    info: {
        description: 'example test',
        version: '1.0.0',
        title: 'Second API',
        termsOfService: 'http://swagger.io/terms/',
        license: {
            name: 'Apache 2.0',
            url: 'http://www.apache.org/licenses/LICENSE-2.0.html',
        },
    },
    post: {
        '/GETUser/{userId}': {
            summary: 'get user',
            description: 'user information',
            servers: [{ url: '/user' }, { url: '/pet', description: '' }],
            get: {
                tags: ['pet'],
                summary: 'Find pet by ID',
                description: 'Returns a single pet',
                operationId: 'getPetById',
                servers: [{ url: '/pet' }],
            },
            parameters: [{ name: 'param1', in: 'header', schema: { description: 'string' } }],
        },
    },
    components: {},
};
exports.thirdDocument = {
    openapi: '3.0.0',
    info: {
        title: 'Third API',
        version: '1.0',
    },
    servers: [
        {
            url: 'https://api.server.test/v1',
        },
    ],
    paths: {},
    components: {
        schemas: {
            SchemaWithNull: {
                type: 'string',
                default: null,
                nullable: true,
            },
            SchemaWithRef: {
                type: 'object',
                properties: {
                    schemaType: {
                        type: 'string',
                        enum: ['foo'],
                    },
                    foo: {
                        $ref: '#/components/schemas/SchemaWithNull',
                    },
                },
            },
            SchemaWithDiscriminator: {
                discriminator: {
                    propertyName: 'schemaType',
                    mapping: {
                        foo: '#/components/schemas/SchemaWithRef',
                        bar: '#/components/schemas/SchemaWithNull',
                    },
                },
                oneOf: [
                    {
                        $ref: '#/components/schemas/SchemaWithRef',
                    },
                    {
                        type: 'object',
                        properties: {
                            schemaType: {
                                type: 'string',
                                enum: ['bar'],
                            },
                            bar: {
                                type: 'string',
                            },
                        },
                    },
                ],
            },
        },
    },
};
