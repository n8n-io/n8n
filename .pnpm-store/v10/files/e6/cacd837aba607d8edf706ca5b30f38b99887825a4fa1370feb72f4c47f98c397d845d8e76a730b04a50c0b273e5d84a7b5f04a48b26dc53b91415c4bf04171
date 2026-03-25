export declare const firstDocument: {
    openapi: string;
    servers: {
        url: string;
    }[];
    info: {
        description: string;
        version: string;
        title: string;
        termsOfService: string;
        license: {
            name: string;
            url: string;
        };
    };
    paths: {
        '/GETUser/{userId}': {
            summary: string;
            description: string;
            servers: ({
                url: string;
                description?: undefined;
            } | {
                url: string;
                description: string;
            })[];
            get: {
                tags: string[];
                summary: string;
                description: string;
                operationId: string;
                servers: {
                    url: string;
                }[];
            };
            parameters: {
                name: string;
                in: string;
                schema: {
                    description: string;
                };
            }[];
        };
    };
    components: {};
};
export declare const secondDocument: {
    openapi: string;
    servers: {
        url: string;
    }[];
    info: {
        description: string;
        version: string;
        title: string;
        termsOfService: string;
        license: {
            name: string;
            url: string;
        };
    };
    post: {
        '/GETUser/{userId}': {
            summary: string;
            description: string;
            servers: ({
                url: string;
                description?: undefined;
            } | {
                url: string;
                description: string;
            })[];
            get: {
                tags: string[];
                summary: string;
                description: string;
                operationId: string;
                servers: {
                    url: string;
                }[];
            };
            parameters: {
                name: string;
                in: string;
                schema: {
                    description: string;
                };
            }[];
        };
    };
    components: {};
};
export declare const thirdDocument: {
    openapi: string;
    info: {
        title: string;
        version: string;
    };
    servers: {
        url: string;
    }[];
    paths: {};
    components: {
        schemas: {
            SchemaWithNull: {
                type: string;
                default: null;
                nullable: boolean;
            };
            SchemaWithRef: {
                type: string;
                properties: {
                    schemaType: {
                        type: string;
                        enum: string[];
                    };
                    foo: {
                        $ref: string;
                    };
                };
            };
            SchemaWithDiscriminator: {
                discriminator: {
                    propertyName: string;
                    mapping: {
                        foo: string;
                        bar: string;
                    };
                };
                oneOf: ({
                    $ref: string;
                    type?: undefined;
                    properties?: undefined;
                } | {
                    type: string;
                    properties: {
                        schemaType: {
                            type: string;
                            enum: string[];
                        };
                        bar: {
                            type: string;
                        };
                    };
                    $ref?: undefined;
                })[];
            };
        };
    };
};
