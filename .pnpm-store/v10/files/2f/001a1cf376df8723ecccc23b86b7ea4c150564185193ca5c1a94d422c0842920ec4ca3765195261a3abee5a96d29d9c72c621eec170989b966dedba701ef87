import * as ajv from 'ajv';
import * as multer from 'multer';
import { FormatsPluginOptions } from 'ajv-formats';
import { Request, Response, NextFunction } from 'express';
import { RouteMetadata } from './openapi.spec.loader';
import AjvDraft4 from 'ajv-draft-04';
import Ajv2020 from 'ajv/dist/2020';
export { OpenAPIFrameworkArgs };
export type AjvInstance = AjvDraft4 | Ajv2020;
export type BodySchema = OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject | {};
export interface ParametersSchema {
    query: object;
    headers: object;
    params: object;
    cookies: object;
}
export interface ValidationSchema extends ParametersSchema {
    body: BodySchema;
}
export interface OpenAPIFrameworkInit {
    apiDoc: OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1;
    basePaths: string[];
}
export type SecurityHandlers = {
    [key: string]: (req: Request, scopes: string[], schema: OpenAPIV3.SecuritySchemeObject) => boolean | Promise<boolean>;
};
export interface MultipartOpts {
    multerOpts: boolean | multer.Options;
    ajvOpts: Options;
}
export interface Options extends ajv.Options {
    serDesMap?: SerDesMap;
    ajvFormats?: FormatsPluginOptions;
}
export interface RequestValidatorOptions extends Options, ValidateRequestOpts {
}
export type ValidateRequestOpts = {
    /**
     * Whether AJV should check all rules and collect all errors or return after the first error.
     *
     * This should not be set to `true` in production. See [AJV: Security risks of trusted
     * schemas](https://ajv.js.org/security.html#security-risks-of-trusted-schemas).
     */
    allErrors?: boolean;
    allowUnknownQueryParameters?: boolean;
    coerceTypes?: boolean | 'array';
    removeAdditional?: boolean | 'all' | 'failing';
};
export type ValidateResponseOpts = {
    /**
     * Whether AJV should check all rules and collect all errors or return after the first error.
     *
     * This should not be set to `true` in production. See [AJV: Security risks of trusted
     * schemas](https://ajv.js.org/security.html#security-risks-of-trusted-schemas).
     */
    allErrors?: boolean;
    removeAdditional?: boolean | 'all' | 'failing';
    coerceTypes?: boolean | 'array';
    onError?: (err: InternalServerError, json: any, req: Request) => void;
};
export type ValidateSecurityOpts = {
    handlers?: SecurityHandlers;
};
export type OperationHandlerOptions = {
    basePath: string;
    resolver: (handlersPath: string, route: RouteMetadata, apiDoc: OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1) => unknown;
};
export type Format = {
    name: string;
    type?: 'number' | 'string';
    validate: (v: any) => boolean;
};
export type SerDes = {
    format: string;
    serialize?: (o: unknown) => string;
    deserialize?: (s: string) => unknown;
};
export declare class SerDesSingleton implements SerDes {
    serializer: SerDes;
    deserializer: SerDes;
    format: string;
    serialize?: (o: unknown) => string;
    deserialize?: (s: string) => unknown;
    constructor(param: {
        format: string;
        serialize: (o: unknown) => string;
        deserialize: (s: string) => unknown;
    });
}
export type SerDesMap = {
    [format: string]: SerDes;
};
type Primitive = undefined | null | boolean | string | number | Function;
type DeepImmutable<T> = T extends Primitive ? T : T extends Array<infer U> ? DeepImmutableArray<U> : T extends Map<infer K, infer V> ? DeepImmutableMap<K, V> : DeepImmutableObject<T>;
interface DeepImmutableArray<T> extends ReadonlyArray<DeepImmutable<T>> {
}
interface DeepImmutableMap<K, V> extends ReadonlyMap<DeepImmutable<K>, DeepImmutable<V>> {
}
type DeepImmutableObject<T> = {
    readonly [K in keyof T]: DeepImmutable<T[K]>;
};
export interface OpenApiValidatorOpts {
    apiSpec: DeepImmutable<OpenAPIV3.DocumentV3> | DeepImmutable<OpenAPIV3.DocumentV3_1> | string;
    validateApiSpec?: boolean;
    validateResponses?: boolean | ValidateResponseOpts;
    validateRequests?: boolean | ValidateRequestOpts;
    validateSecurity?: boolean | ValidateSecurityOpts;
    ignorePaths?: RegExp | Function;
    ignoreUndocumented?: boolean;
    securityHandlers?: SecurityHandlers;
    coerceTypes?: boolean | 'array';
    useRequestUrl?: boolean;
    /**
     * @deprecated
     * Use `formats` + `validateFormats` to ignore specified formats
     */
    unknownFormats?: true | string[] | 'ignore';
    serDes?: SerDes[];
    formats?: Format[] | Record<string, ajv.Format>;
    ajvFormats?: FormatsPluginOptions;
    fileUploader?: boolean | multer.Options;
    multerOpts?: multer.Options;
    $refParser?: {
        mode: 'bundle' | 'dereference';
    };
    operationHandlers?: false | string | OperationHandlerOptions;
    validateFormats?: boolean | 'fast' | 'full';
}
export interface NormalizedOpenApiValidatorOpts extends OpenApiValidatorOpts {
    validateApiSpec: boolean;
    validateResponses: false | ValidateResponseOpts;
    validateRequests: false | ValidateRequestOpts;
    validateSecurity: false | ValidateSecurityOpts;
    fileUploader: boolean | multer.Options;
    $refParser: {
        mode: 'bundle' | 'dereference';
    };
    operationHandlers: false | OperationHandlerOptions;
    formats: Record<string, ajv.Format>;
    validateFormats: boolean;
    unknownFormats?: never;
}
export declare namespace OpenAPIV3 {
    export interface DocumentV3 {
        openapi: `3.0.${string}`;
        info: InfoObject;
        servers?: ServerObject[];
        paths: PathsObject;
        components?: ComponentsObject;
        security?: SecurityRequirementObject[];
        tags?: TagObject[];
        externalDocs?: ExternalDocumentationObject;
    }
    interface ComponentsV3_1 extends ComponentsObject {
        pathItems?: {
            [path: string]: PathItemObject | ReferenceObject;
        };
    }
    export interface DocumentV3_1 extends Omit<DocumentV3, 'paths' | 'info' | 'components' | "openapi"> {
        openapi: `3.1.${string}`;
        paths?: DocumentV3['paths'];
        info: InfoObjectV3_1;
        components: ComponentsV3_1;
        webhooks: {
            [name: string]: PathItemObject | ReferenceObject;
        };
    }
    export interface InfoObject {
        title: string;
        description?: string;
        termsOfService?: string;
        contact?: ContactObject;
        license?: LicenseObject;
        version: string;
    }
    interface InfoObjectV3_1 extends InfoObject {
        summary: string;
    }
    export interface ContactObject {
        name?: string;
        url?: string;
        email?: string;
    }
    export interface LicenseObject {
        name: string;
        url?: string;
    }
    export interface ServerObject {
        url: string;
        description?: string;
        variables?: {
            [variable: string]: ServerVariableObject;
        };
    }
    export interface ServerVariableObject {
        enum?: string[];
        default: string;
        description?: string;
    }
    export interface PathsObject {
        [pattern: string]: PathItemObject;
    }
    export interface PathItemObject {
        $ref?: string;
        summary?: string;
        description?: string;
        get?: OperationObject;
        put?: OperationObject;
        post?: OperationObject;
        delete?: OperationObject;
        options?: OperationObject;
        head?: OperationObject;
        patch?: OperationObject;
        trace?: OperationObject;
        servers?: ServerObject[];
        parameters?: Array<ReferenceObject | ParameterObject>;
    }
    export interface OperationObject {
        tags?: string[];
        summary?: string;
        description?: string;
        externalDocs?: ExternalDocumentationObject;
        operationId?: string;
        parameters?: Array<ReferenceObject | ParameterObject>;
        requestBody?: ReferenceObject | RequestBodyObject;
        responses?: ResponsesObject;
        callbacks?: {
            [callback: string]: ReferenceObject | CallbackObject;
        };
        deprecated?: boolean;
        security?: SecurityRequirementObject[];
        servers?: ServerObject[];
    }
    export interface ExternalDocumentationObject {
        description?: string;
        url: string;
    }
    export interface ParameterObject extends ParameterBaseObject {
        name: string;
        in: string;
    }
    export interface HeaderObject extends ParameterBaseObject {
    }
    interface ParameterBaseObject {
        description?: string;
        required?: boolean;
        deprecated?: boolean;
        allowEmptyValue?: boolean;
        style?: string;
        explode?: boolean;
        allowReserved?: boolean;
        schema?: ReferenceObject | SchemaObject;
        example?: any;
        examples?: {
            [media: string]: ReferenceObject | ExampleObject;
        };
        content?: {
            [media: string]: MediaTypeObject;
        };
    }
    export type NonArraySchemaObjectType = 'null' | 'boolean' | 'object' | 'number' | 'string' | 'integer';
    export type ArraySchemaObjectType = 'array';
    export type SchemaObject = ArraySchemaObject | NonArraySchemaObject | CompositionSchemaObject;
    export interface ArraySchemaObject extends BaseSchemaObject<ArraySchemaObjectType> {
        items: ReferenceObject | SchemaObject;
    }
    export interface NonArraySchemaObject extends BaseSchemaObject<NonArraySchemaObjectType> {
    }
    export interface CompositionSchemaObject extends BaseSchemaObject<undefined> {
        allOf?: Array<ReferenceObject | SchemaObject>;
        oneOf?: Array<ReferenceObject | SchemaObject>;
        anyOf?: Array<ReferenceObject | SchemaObject>;
        not?: ReferenceObject | SchemaObject;
        discriminator?: DiscriminatorObject;
    }
    interface BaseSchemaObject<T> {
        type?: T;
        title?: string;
        description?: string;
        format?: string;
        default?: any;
        multipleOf?: number;
        maximum?: number;
        exclusiveMaximum?: boolean;
        minimum?: number;
        exclusiveMinimum?: boolean;
        maxLength?: number;
        minLength?: number;
        pattern?: string;
        additionalProperties?: boolean | ReferenceObject | SchemaObject;
        maxItems?: number;
        minItems?: number;
        uniqueItems?: boolean;
        maxProperties?: number;
        minProperties?: number;
        required?: string[];
        enum?: any[];
        properties?: {
            [name: string]: ReferenceObject | SchemaObject;
        };
        nullable?: boolean;
        readOnly?: boolean;
        writeOnly?: boolean;
        xml?: XMLObject;
        externalDocs?: ExternalDocumentationObject;
        example?: any;
        examples?: any;
        deprecated?: boolean;
        componentId?: string;
    }
    export interface DiscriminatorObject {
        propertyName: string;
        mapping?: {
            [value: string]: string;
        };
    }
    export interface XMLObject {
        name?: string;
        namespace?: string;
        prefix?: string;
        attribute?: boolean;
        wrapped?: boolean;
    }
    export interface ReferenceObject {
        $ref: string;
    }
    export interface ExampleObject {
        summary?: string;
        description?: string;
        value?: any;
        externalValue?: string;
    }
    export interface MediaTypeObject {
        schema?: ReferenceObject | SchemaObject;
        example?: any;
        examples?: {
            [media: string]: ReferenceObject | ExampleObject;
        };
        encoding?: {
            [media: string]: EncodingObject;
        };
    }
    export interface EncodingObject {
        contentType?: string;
        headers?: {
            [header: string]: ReferenceObject | HeaderObject;
        };
        style?: string;
        explode?: boolean;
        allowReserved?: boolean;
    }
    export interface RequestBodyObject {
        description?: string;
        content: {
            [media: string]: MediaTypeObject;
        };
        required?: boolean;
    }
    export interface ResponsesObject {
        [code: string]: ReferenceObject | ResponseObject;
    }
    export interface ResponseObject {
        description: string;
        headers?: {
            [header: string]: ReferenceObject | HeaderObject;
        };
        content?: {
            [media: string]: MediaTypeObject;
        };
        links?: {
            [link: string]: ReferenceObject | LinkObject;
        };
    }
    export interface LinkObject {
        operationRef?: string;
        operationId?: string;
        parameters?: {
            [parameter: string]: any;
        };
        requestBody?: any;
        description?: string;
        server?: ServerObject;
    }
    export interface CallbackObject {
        [url: string]: PathItemObject;
    }
    export interface SecurityRequirementObject {
        [name: string]: string[];
    }
    export interface ComponentsObject {
        schemas?: {
            [key: string]: ReferenceObject | SchemaObject;
        };
        responses?: {
            [key: string]: ReferenceObject | ResponseObject;
        };
        parameters?: {
            [key: string]: ReferenceObject | ParameterObject;
        };
        examples?: {
            [key: string]: ReferenceObject | ExampleObject;
        };
        requestBodies?: {
            [key: string]: ReferenceObject | RequestBodyObject;
        };
        headers?: {
            [key: string]: ReferenceObject | HeaderObject;
        };
        securitySchemes?: {
            [key: string]: ReferenceObject | SecuritySchemeObject;
        };
        links?: {
            [key: string]: ReferenceObject | LinkObject;
        };
        callbacks?: {
            [key: string]: ReferenceObject | CallbackObject;
        };
    }
    export type SecuritySchemeObject = HttpSecurityScheme | ApiKeySecurityScheme | OAuth2SecurityScheme | OpenIdSecurityScheme;
    export interface HttpSecurityScheme {
        type: 'http';
        description?: string;
        scheme: string;
        bearerFormat?: string;
    }
    export interface ApiKeySecurityScheme {
        type: 'apiKey';
        description?: string;
        name: string;
        in: string;
    }
    export interface OAuth2SecurityScheme {
        type: 'oauth2';
        flows: {
            implicit?: {
                authorizationUrl: string;
                refreshUrl?: string;
                scopes: {
                    [scope: string]: string;
                };
            };
            password?: {
                tokenUrl: string;
                refreshUrl?: string;
                scopes: {
                    [scope: string]: string;
                };
            };
            clientCredentials?: {
                tokenUrl: string;
                refreshUrl?: string;
                scopes: {
                    [scope: string]: string;
                };
            };
            authorizationCode?: {
                authorizationUrl: string;
                tokenUrl: string;
                refreshUrl?: string;
                scopes: {
                    [scope: string]: string;
                };
            };
        };
    }
    export interface OpenIdSecurityScheme {
        type: 'openIdConnect';
        description?: string;
        openIdConnectUrl: string;
    }
    export interface TagObject {
        name: string;
        description?: string;
        externalDocs?: ExternalDocumentationObject;
    }
    export {};
}
export interface OpenAPIFrameworkPathObject {
    path?: string;
    module?: any;
}
interface OpenAPIFrameworkArgs {
    apiDoc: OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1 | string;
    validateApiSpec?: boolean;
    $refParser?: {
        mode: 'bundle' | 'dereference';
    };
}
export interface OpenAPIFrameworkAPIContext {
    basePaths: string[];
    getApiDoc(): OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1;
}
export interface OpenAPIFrameworkVisitor {
    visitApi?(context: OpenAPIFrameworkAPIContext): void;
}
export interface OpenApiRequestMetadata {
    expressRoute: string;
    openApiRoute: string;
    pathParams: {
        [index: string]: string;
    };
    schema: OpenAPIV3.OperationObject;
    serial: number;
}
export interface OpenApiRequest extends Request {
    openapi?: OpenApiRequestMetadata;
}
export type OpenApiRequestHandler = (req: OpenApiRequest, res: Response, next: NextFunction) => any;
export interface IJsonSchema {
    id?: string;
    $schema?: string;
    title?: string;
    description?: string;
    multipleOf?: number;
    maximum?: number;
    exclusiveMaximum?: boolean;
    minimum?: number;
    exclusiveMinimum?: boolean;
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    additionalItems?: boolean | IJsonSchema;
    items?: IJsonSchema | IJsonSchema[];
    maxItems?: number;
    minItems?: number;
    uniqueItems?: boolean;
    maxProperties?: number;
    minProperties?: number;
    required?: string[];
    additionalProperties?: boolean | IJsonSchema;
    definitions?: {
        [name: string]: IJsonSchema;
    };
    properties?: {
        [name: string]: IJsonSchema;
    };
    patternProperties?: {
        [name: string]: IJsonSchema;
    };
    dependencies?: {
        [name: string]: IJsonSchema | string[];
    };
    enum?: any[];
    type?: string | string[];
    allOf?: IJsonSchema[];
    anyOf?: IJsonSchema[];
    oneOf?: IJsonSchema[];
    not?: IJsonSchema;
}
export interface ValidationError {
    message?: string;
    status: number;
    errors: ValidationErrorItem[];
}
export interface ValidationErrorItem {
    path: string;
    message: string;
    errorCode?: string;
}
interface ErrorHeaders {
    Allow?: string;
}
export declare class HttpError extends Error implements ValidationError {
    status: number;
    path?: string;
    name: string;
    message: string;
    headers?: ErrorHeaders;
    errors: ValidationErrorItem[];
    constructor(err: {
        status: number;
        path: string;
        name: string;
        message?: string;
        headers?: ErrorHeaders;
        errors?: ValidationErrorItem[];
    });
    static create(err: {
        status: number;
        path: string;
        message?: string;
        errors?: ValidationErrorItem[];
    }): InternalServerError | UnsupportedMediaType | RequestEntityTooLarge | BadRequest | MethodNotAllowed | NotAcceptable | NotFound | Unauthorized | Forbidden;
}
export declare class NotFound extends HttpError {
    constructor(err: {
        path: string;
        message?: string;
        overrideStatus?: number;
    });
}
export declare class NotAcceptable extends HttpError {
    constructor(err: {
        path: string;
        message?: string;
        overrideStatus?: number;
    });
}
export declare class MethodNotAllowed extends HttpError {
    constructor(err: {
        path: string;
        message?: string;
        headers?: ErrorHeaders;
        overrideStatus?: number;
    });
}
export declare class BadRequest extends HttpError {
    constructor(err: {
        path: string;
        message?: string;
        overrideStatus?: number;
        errors?: ValidationErrorItem[];
    });
}
export declare class RequestEntityTooLarge extends HttpError {
    constructor(err: {
        path: string;
        message?: string;
        overrideStatus?: number;
    });
}
export declare class InternalServerError extends HttpError {
    constructor(err: {
        path?: string;
        message?: string;
        overrideStatus?: number;
        errors?: ValidationErrorItem[];
    });
}
export declare class UnsupportedMediaType extends HttpError {
    constructor(err: {
        path: string;
        message?: string;
        overrideStatus?: number;
    });
}
export declare class Unauthorized extends HttpError {
    constructor(err: {
        path: string;
        message?: string;
        overrideStatus?: number;
    });
}
export declare class Forbidden extends HttpError {
    constructor(err: {
        path: string;
        message?: string;
        overrideStatus?: number;
    });
}
