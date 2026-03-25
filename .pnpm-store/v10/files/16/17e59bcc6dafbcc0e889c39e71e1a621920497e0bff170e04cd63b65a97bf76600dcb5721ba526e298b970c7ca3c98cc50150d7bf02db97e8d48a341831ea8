import type { Omit } from './index';
export interface OpenAPISpec {
    openapi: string;
    info: OpenAPIInfo;
    servers?: OpenAPIServer[];
    paths: OpenAPIPaths;
    components?: OpenAPIComponents;
    security?: OpenAPISecurityRequirement[];
    tags?: OpenAPITag[];
    externalDocs?: OpenAPIExternalDocumentation;
    'x-webhooks'?: OpenAPIPaths;
    webhooks?: OpenAPIPaths;
}
export interface OpenAPIInfo {
    title: string;
    version: string;
    description?: string;
    summary?: string;
    termsOfService?: string;
    contact?: OpenAPIContact;
    license?: OpenAPILicense;
}
export interface OpenAPIServer {
    url: string;
    description?: string;
    variables?: {
        [name: string]: OpenAPIServerVariable;
    };
}
export interface OpenAPIServerVariable {
    enum?: string[];
    default: string;
    description?: string;
}
export interface OpenAPIPaths {
    [path: string]: OpenAPIPath;
}
export interface OpenAPIRef {
    'x-refsStack'?: string[];
    $ref: string;
    summary?: string;
    description?: string;
}
export type Referenced<T> = OpenAPIRef | T;
export interface OpenAPIPath {
    summary?: string;
    description?: string;
    get?: OpenAPIOperation;
    put?: OpenAPIOperation;
    post?: OpenAPIOperation;
    delete?: OpenAPIOperation;
    options?: OpenAPIOperation;
    head?: OpenAPIOperation;
    patch?: OpenAPIOperation;
    trace?: OpenAPIOperation;
    servers?: OpenAPIServer[];
    parameters?: Array<Referenced<OpenAPIParameter>>;
    $ref?: string;
}
export interface OpenAPIXCodeSample {
    lang: string;
    label?: string;
    source: string;
}
export interface OpenAPIXBadges {
    name: string;
    color?: string;
    position?: 'before' | 'after';
}
export interface OpenAPIOperation {
    tags?: string[];
    summary?: string;
    description?: string;
    externalDocs?: OpenAPIExternalDocumentation;
    operationId?: string;
    parameters?: Array<Referenced<OpenAPIParameter>>;
    requestBody?: Referenced<OpenAPIRequestBody>;
    responses: OpenAPIResponses;
    callbacks?: {
        [name: string]: Referenced<OpenAPICallback>;
    };
    deprecated?: boolean;
    security?: OpenAPISecurityRequirement[];
    servers?: OpenAPIServer[];
    'x-codeSamples'?: OpenAPIXCodeSample[];
    'x-code-samples'?: OpenAPIXCodeSample[];
    'x-badges'?: OpenAPIXBadges[];
}
export interface OpenAPIParameter {
    name: string;
    in?: OpenAPIParameterLocation;
    description?: string;
    required?: boolean;
    deprecated?: boolean;
    allowEmptyValue?: boolean;
    style?: OpenAPIParameterStyle;
    explode?: boolean;
    allowReserved?: boolean;
    schema?: Referenced<OpenAPISchema>;
    example?: any;
    examples?: {
        [media: string]: Referenced<OpenAPIExample>;
    };
    content?: {
        [media: string]: OpenAPIMediaType;
    };
    encoding?: Record<string, OpenAPIEncoding>;
    const?: any;
}
export interface OpenAPIExample {
    value: any;
    summary?: string;
    description?: string;
    externalValue?: string;
}
export interface OpenAPISchema {
    $ref?: string;
    type?: string | string[];
    properties?: {
        [name: string]: OpenAPISchema;
    };
    patternProperties?: {
        [name: string]: OpenAPISchema;
    };
    additionalProperties?: boolean | OpenAPISchema;
    unevaluatedProperties?: boolean | OpenAPISchema;
    description?: string;
    default?: any;
    items?: OpenAPISchema | OpenAPISchema[] | boolean;
    required?: string[];
    readOnly?: boolean;
    writeOnly?: boolean;
    deprecated?: boolean;
    format?: string;
    externalDocs?: OpenAPIExternalDocumentation;
    discriminator?: OpenAPIDiscriminator;
    nullable?: boolean;
    oneOf?: OpenAPISchema[];
    anyOf?: OpenAPISchema[];
    allOf?: OpenAPISchema[];
    not?: OpenAPISchema;
    title?: string;
    multipleOf?: number;
    maximum?: number;
    exclusiveMaximum?: boolean | number;
    minimum?: number;
    exclusiveMinimum?: boolean | number;
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    maxItems?: number;
    minItems?: number;
    uniqueItems?: boolean;
    maxProperties?: number;
    minProperties?: number;
    enum?: any[];
    example?: any;
    if?: OpenAPISchema;
    else?: OpenAPISchema;
    then?: OpenAPISchema;
    examples?: any[];
    const?: string;
    contentEncoding?: string;
    contentMediaType?: string;
    prefixItems?: OpenAPISchema[];
    additionalItems?: OpenAPISchema | boolean;
}
export interface OpenAPIDiscriminator {
    propertyName: string;
    mapping?: {
        [name: string]: string;
    };
    'x-explicitMappingOnly'?: boolean;
}
export interface OpenAPIMediaType {
    schema?: Referenced<OpenAPISchema>;
    example?: any;
    examples?: {
        [name: string]: Referenced<OpenAPIExample>;
    };
    encoding?: {
        [field: string]: OpenAPIEncoding;
    };
}
export interface OpenAPIEncoding {
    contentType: string;
    headers?: {
        [name: string]: Referenced<OpenAPIHeader>;
    };
    style: OpenAPIParameterStyle;
    explode: boolean;
    allowReserved: boolean;
}
export type OpenAPIParameterLocation = 'query' | 'header' | 'path' | 'cookie';
export type OpenAPIParameterStyle = 'matrix' | 'label' | 'form' | 'simple' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject';
export interface OpenAPIRequestBody {
    description?: string;
    required?: boolean;
    content: {
        [mime: string]: OpenAPIMediaType;
    };
    'x-examples'?: {
        [mime: string]: {
            [name: string]: Referenced<OpenAPIExample>;
        };
    };
    'x-example'?: {
        [mime: string]: any;
    };
}
export interface OpenAPIResponses {
    [code: string]: Referenced<OpenAPIResponse>;
}
export interface OpenAPIResponse extends Pick<OpenAPIRequestBody, 'description' | 'x-examples' | 'x-example'> {
    headers?: {
        [name: string]: Referenced<OpenAPIHeader>;
    };
    links?: {
        [name: string]: Referenced<OpenAPILink>;
    };
    content?: {
        [mime: string]: OpenAPIMediaType;
    };
}
export interface OpenAPILink {
    $ref?: string;
}
export type OpenAPIHeader = Omit<OpenAPIParameter, 'in' | 'name'>;
export interface OpenAPICallback {
    [name: string]: OpenAPIPath;
}
export interface OpenAPIComponents {
    schemas?: {
        [name: string]: Referenced<OpenAPISchema>;
    };
    responses?: {
        [name: string]: Referenced<OpenAPIResponse>;
    };
    parameters?: {
        [name: string]: Referenced<OpenAPIParameter>;
    };
    examples?: {
        [name: string]: Referenced<OpenAPIExample>;
    };
    requestBodies?: {
        [name: string]: Referenced<OpenAPIRequestBody>;
    };
    headers?: {
        [name: string]: Referenced<OpenAPIHeader>;
    };
    securitySchemes?: {
        [name: string]: Referenced<OpenAPISecurityScheme>;
    };
    links?: {
        [name: string]: Referenced<OpenAPILink>;
    };
    callbacks?: {
        [name: string]: Referenced<OpenAPICallback>;
    };
}
export interface OpenAPISecurityRequirement {
    [name: string]: string[];
}
export interface OpenAPISecurityScheme {
    type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
    description?: string;
    name?: string;
    in?: 'query' | 'header' | 'cookie';
    scheme?: string;
    bearerFormat: string;
    flows: {
        implicit?: {
            refreshUrl?: string;
            scopes: Record<string, string>;
            authorizationUrl: string;
        };
        password?: {
            refreshUrl?: string;
            scopes: Record<string, string>;
            tokenUrl: string;
        };
        clientCredentials?: {
            refreshUrl?: string;
            scopes: Record<string, string>;
            tokenUrl: string;
        };
        authorizationCode?: {
            refreshUrl?: string;
            scopes: Record<string, string>;
            tokenUrl: string;
        };
    };
    openIdConnectUrl?: string;
}
export interface OpenAPITag {
    name: string;
    description?: string;
    externalDocs?: OpenAPIExternalDocumentation;
    'x-displayName'?: string;
}
export interface OpenAPIExternalDocumentation {
    description?: string;
    url: string;
}
export interface OpenAPIContact {
    name?: string;
    url?: string;
    email?: string;
}
export interface OpenAPILicense {
    name: string;
    url?: string;
    identifier?: string;
}
