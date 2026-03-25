import { AbortSignalLike } from '@azure/abort-controller';
import { AuthorizeRequestOnChallengeOptions } from '@azure/core-rest-pipeline';
import { HttpClient } from '@azure/core-rest-pipeline';
import { HttpMethods } from '@azure/core-rest-pipeline';
import { InternalPipelineOptions } from '@azure/core-rest-pipeline';
import { OperationTracingOptions } from '@azure/core-tracing';
import { Pipeline } from '@azure/core-rest-pipeline';
import { PipelineOptions } from '@azure/core-rest-pipeline';
import { PipelinePolicy } from '@azure/core-rest-pipeline';
import { PipelineRequest } from '@azure/core-rest-pipeline';
import { PipelineResponse } from '@azure/core-rest-pipeline';
import { TokenCredential } from '@azure/core-auth';
import { TransferProgressEvent } from '@azure/core-rest-pipeline';

/**
 * Used to configure additional policies added to the pipeline at construction.
 */
export declare interface AdditionalPolicyConfig {
    /**
     * A policy to be added.
     */
    policy: PipelinePolicy;
    /**
     * Determines if this policy be applied before or after retry logic.
     * Only use `perRetry` if you need to modify the request again
     * each time the operation is retried due to retryable service
     * issues.
     */
    position: "perCall" | "perRetry";
}

/**
 * This function can be used as a callback for the `bearerTokenAuthenticationPolicy` of `@azure/core-rest-pipeline`, to support CAE challenges:
 * [Continuous Access Evaluation](https://docs.microsoft.com/azure/active-directory/conditional-access/concept-continuous-access-evaluation).
 *
 * Call the `bearerTokenAuthenticationPolicy` with the following options:
 *
 * ```ts
 * import { bearerTokenAuthenticationPolicy } from "@azure/core-rest-pipeline";
 * import { authorizeRequestOnClaimChallenge } from "@azure/core-client";
 *
 * const bearerTokenAuthenticationPolicy = bearerTokenAuthenticationPolicy({
 *   authorizeRequestOnChallenge: authorizeRequestOnClaimChallenge
 * });
 * ```
 *
 * Once provided, the `bearerTokenAuthenticationPolicy` policy will internally handle Continuous Access Evaluation (CAE) challenges.
 * When it can't complete a challenge it will return the 401 (unauthorized) response from ARM.
 *
 * Example challenge with claims:
 *
 * ```
 * Bearer authorization_uri="https://login.windows-ppe.net/", error="invalid_token",
 * error_description="User session has been revoked",
 * claims="eyJhY2Nlc3NfdG9rZW4iOnsibmJmIjp7ImVzc2VudGlhbCI6dHJ1ZSwgInZhbHVlIjoiMTYwMzc0MjgwMCJ9fX0="
 * ```
 */
export declare function authorizeRequestOnClaimChallenge(onChallengeOptions: AuthorizeRequestOnChallengeOptions): Promise<boolean>;

/**
 * Defines a callback to handle auth challenge for Storage APIs.
 * This implements the bearer challenge process described here: https://docs.microsoft.com/rest/api/storageservices/authorize-with-azure-active-directory#bearer-challenge
 * Handling has specific features for storage that departs to the general AAD challenge docs.
 **/
export declare const authorizeRequestOnTenantChallenge: (challengeOptions: AuthorizeRequestOnChallengeOptions) => Promise<boolean>;

/**
 * The base definition of a mapper. Can be used for XML and plain JavaScript objects.
 */
export declare interface BaseMapper {
    /**
     * Name for the xml element
     */
    xmlName?: string;
    /**
     * Xml element namespace
     */
    xmlNamespace?: string;
    /**
     * Xml element namespace prefix
     */
    xmlNamespacePrefix?: string;
    /**
     * Determines if the current property should be serialized as an attribute of the parent xml element
     */
    xmlIsAttribute?: boolean;
    /**
     * Determines if the current property should be serialized as the inner content of the xml element
     */
    xmlIsMsText?: boolean;
    /**
     * Name for the xml elements when serializing an array
     */
    xmlElementName?: string;
    /**
     * Whether or not the current property should have a wrapping XML element
     */
    xmlIsWrapped?: boolean;
    /**
     * Whether or not the current property is readonly
     */
    readOnly?: boolean;
    /**
     * Whether or not the current property is a constant
     */
    isConstant?: boolean;
    /**
     * Whether or not the current property is required
     */
    required?: boolean;
    /**
     * Whether or not the current property allows mull as a value
     */
    nullable?: boolean;
    /**
     * The name to use when serializing
     */
    serializedName?: string;
    /**
     * Type of the mapper
     */
    type: MapperType;
    /**
     * Default value when one is not explicitly provided
     */
    defaultValue?: any;
    /**
     * Constraints to test the current value against
     */
    constraints?: MapperConstraints;
}

/**
 * The common set of options that high level clients are expected to expose.
 */
export declare interface CommonClientOptions extends PipelineOptions {
    /**
     * The HttpClient that will be used to send HTTP requests.
     */
    httpClient?: HttpClient;
    /**
     * Set to true if the request is sent over HTTP instead of HTTPS
     */
    allowInsecureConnection?: boolean;
    /**
     * Additional policies to include in the HTTP pipeline.
     */
    additionalPolicies?: AdditionalPolicyConfig[];
}

/**
 * A mapper composed of other mappers.
 */
export declare interface CompositeMapper extends BaseMapper {
    /**
     * The type descriptor of the `CompositeMapper`.
     */
    type: CompositeMapperType;
}

/**
 * Helps build a mapper that describes how to map a set of properties of an object based on other mappers.
 *
 * Only one of the following properties should be present: `className`, `modelProperties` and `additionalProperties`.
 */
export declare interface CompositeMapperType {
    /**
     * Name of the composite mapper type.
     */
    name: "Composite";
    /**
     * Use `className` to reference another type definition.
     */
    className?: string;
    /**
     * Use `modelProperties` when the reference to the other type has been resolved.
     */
    modelProperties?: {
        [propertyName: string]: Mapper;
    };
    /**
     * Used when a model has `additionalProperties: true`. Allows the generic processing of unnamed model properties on the response object.
     */
    additionalProperties?: Mapper;
    /**
     * The name of the top-most parent scheme, the one that has no parents.
     */
    uberParent?: string;
    /**
     * A polymorphic discriminator.
     */
    polymorphicDiscriminator?: PolymorphicDiscriminator;
}

/**
 * Creates a new Pipeline for use with a Service Client.
 * Adds in deserializationPolicy by default.
 * Also adds in bearerTokenAuthenticationPolicy if passed a TokenCredential.
 * @param options - Options to customize the created pipeline.
 */
export declare function createClientPipeline(options?: InternalClientPipelineOptions): Pipeline;

/**
 * Method that creates and returns a Serializer.
 * @param modelMappers - Known models to map
 * @param isXML - If XML should be supported
 */
export declare function createSerializer(modelMappers?: {
    [key: string]: any;
}, isXML?: boolean): Serializer;

/**
 * The content-types that will indicate that an operation response should be deserialized in a
 * particular way.
 */
export declare interface DeserializationContentTypes {
    /**
     * The content-types that indicate that an operation response should be deserialized as JSON.
     * Defaults to [ "application/json", "text/json" ].
     */
    json?: string[];
    /**
     * The content-types that indicate that an operation response should be deserialized as XML.
     * Defaults to [ "application/xml", "application/atom+xml" ].
     */
    xml?: string[];
}

/**
 * This policy handles parsing out responses according to OperationSpecs on the request.
 */
export declare function deserializationPolicy(options?: DeserializationPolicyOptions): PipelinePolicy;

/**
 * The programmatic identifier of the deserializationPolicy.
 */
export declare const deserializationPolicyName = "deserializationPolicy";

/**
 * Options to configure API response deserialization.
 */
export declare interface DeserializationPolicyOptions {
    /**
     * Configures the expected content types for the deserialization of
     * JSON and XML response bodies.
     */
    expectedContentTypes?: DeserializationContentTypes;
    /**
     * A function that is able to parse XML. Required for XML support.
     */
    parseXML?: (str: string, opts?: XmlOptions) => Promise<any>;
    /**
     * Configures behavior of xml parser and builder.
     */
    serializerOptions?: SerializerOptions;
}

/**
 * A mapper describing plain JavaScript objects used as key/value pairs.
 */
export declare interface DictionaryMapper extends BaseMapper {
    /**
     * The type descriptor of the `DictionaryMapper`.
     */
    type: DictionaryMapperType;
    /**
     * Optionally, a prefix to add to the header collection.
     */
    headerCollectionPrefix?: string;
}

/**
 * Helps build a mapper that describes how to parse a dictionary of mapped values.
 */
export declare interface DictionaryMapperType {
    /**
     * Name of the sequence type mapper.
     */
    name: "Dictionary";
    /**
     * The mapper to use to map the value of each property in the dictionary.
     */
    value: Mapper;
}

/**
 * A mapper describing an enum value.
 */
export declare interface EnumMapper extends BaseMapper {
    /**
     * The type descriptor of the `EnumMapper`.
     */
    type: EnumMapperType;
}

/**
 * Helps build a mapper that describes how to parse an enum value.
 */
export declare interface EnumMapperType {
    /**
     * Name of the enum type mapper.
     */
    name: "Enum";
    /**
     * Values allowed by this mapper.
     */
    allowedValues: any[];
}

/**
 * Wrapper object for http request and response. Deserialized object is stored in
 * the `parsedBody` property when the response body is received in JSON or XML.
 */
export declare interface FullOperationResponse extends PipelineResponse {
    /**
     * The parsed HTTP response headers.
     */
    parsedHeaders?: {
        [key: string]: unknown;
    };
    /**
     * The response body as parsed JSON or XML.
     */
    parsedBody?: any;
    /**
     * The request that generated the response.
     */
    request: OperationRequest;
}

/**
 * Options for creating a Pipeline to use with ServiceClient.
 * Mostly for customizing the auth policy (if using token auth) or
 * the deserialization options when using XML.
 */
export declare interface InternalClientPipelineOptions extends InternalPipelineOptions {
    /**
     * Options to customize bearerTokenAuthenticationPolicy.
     */
    credentialOptions?: {
        credentialScopes: string | string[];
        credential: TokenCredential;
    };
    /**
     * Options to customize deserializationPolicy.
     */
    deserializationOptions?: DeserializationPolicyOptions;
    /**
     * Options to customize serializationPolicy.
     */
    serializationOptions?: SerializationPolicyOptions;
}

/**
 * Mappers are definitions of the data models used in the library.
 * These data models are part of the Operation or Client definitions in the responses or parameters.
 */
export declare type Mapper = BaseMapper | CompositeMapper | SequenceMapper | DictionaryMapper | EnumMapper;

/**
 * Description of various value constraints such as integer ranges and string regex.
 */
export declare interface MapperConstraints {
    /**
     * The value should be less than or equal to the `InclusiveMaximum` value.
     */
    InclusiveMaximum?: number;
    /**
     * The value should be less than the `ExclusiveMaximum` value.
     */
    ExclusiveMaximum?: number;
    /**
     * The value should be greater than or equal to the `InclusiveMinimum` value.
     */
    InclusiveMinimum?: number;
    /**
     * The value should be greater than the `InclusiveMinimum` value.
     */
    ExclusiveMinimum?: number;
    /**
     * The length should be smaller than the `MaxLength`.
     */
    MaxLength?: number;
    /**
     * The length should be bigger than the `MinLength`.
     */
    MinLength?: number;
    /**
     * The value must match the pattern.
     */
    Pattern?: RegExp;
    /**
     * The value must contain fewer items than the MaxItems value.
     */
    MaxItems?: number;
    /**
     * The value must contain more items than the `MinItems` value.
     */
    MinItems?: number;
    /**
     * The value must contain only unique items.
     */
    UniqueItems?: true;
    /**
     * The value should be exactly divisible by the `MultipleOf` value.
     */
    MultipleOf?: number;
}

/**
 * Type of the mapper. Includes known mappers.
 */
export declare type MapperType = SimpleMapperType | CompositeMapperType | SequenceMapperType | DictionaryMapperType | EnumMapperType;

/**
 * Known types of Mappers
 */
export declare const MapperTypeNames: {
    readonly Base64Url: "Base64Url";
    readonly Boolean: "Boolean";
    readonly ByteArray: "ByteArray";
    readonly Composite: "Composite";
    readonly Date: "Date";
    readonly DateTime: "DateTime";
    readonly DateTimeRfc1123: "DateTimeRfc1123";
    readonly Dictionary: "Dictionary";
    readonly Enum: "Enum";
    readonly Number: "Number";
    readonly Object: "Object";
    readonly Sequence: "Sequence";
    readonly String: "String";
    readonly Stream: "Stream";
    readonly TimeSpan: "TimeSpan";
    readonly UnixTime: "UnixTime";
};

/**
 * A collection of properties that apply to a single invocation of an operation.
 */
export declare interface OperationArguments {
    /**
     * The parameters that were passed to the operation method.
     */
    [parameterName: string]: unknown;
    /**
     * The optional arguments that are provided to an operation.
     */
    options?: OperationOptions;
}

/**
 * The base options type for all operations.
 */
export declare interface OperationOptions {
    /**
     * The signal which can be used to abort requests.
     */
    abortSignal?: AbortSignalLike;
    /**
     * Options used when creating and sending HTTP requests for this operation.
     */
    requestOptions?: OperationRequestOptions;
    /**
     * Options used when tracing is enabled.
     */
    tracingOptions?: OperationTracingOptions;
    /**
     * Options to override serialization/de-serialization behavior.
     */
    serializerOptions?: SerializerOptions;
    /**
     * A function to be called each time a response is received from the server
     * while performing the requested operation.
     * May be called multiple times.
     */
    onResponse?: RawResponseCallback;
}

/**
 * A common interface that all Operation parameter's extend.
 */
export declare interface OperationParameter {
    /**
     * The path to this parameter's value in OperationArguments or the object that contains paths for
     * each property's value in OperationArguments.
     */
    parameterPath: ParameterPath;
    /**
     * The mapper that defines how to validate and serialize this parameter's value.
     */
    mapper: Mapper;
}

/**
 * A parameter for an operation that will be added as a query parameter to the operation's HTTP
 * request.
 */
export declare interface OperationQueryParameter extends OperationParameter {
    /**
     * Whether or not to skip encoding the query parameter's value before adding it to the URL.
     */
    skipEncoding?: boolean;
    /**
     * If this query parameter's value is a collection, what type of format should the value be
     * converted to.
     */
    collectionFormat?: QueryCollectionFormat;
}

/**
 * A type alias for future proofing.
 */
export declare type OperationRequest = PipelineRequest;

/**
 * Metadata that is used to properly parse a response.
 */
export declare interface OperationRequestInfo {
    /**
     * Used to parse the response.
     */
    operationSpec?: OperationSpec;
    /**
     * Used to encode the request.
     */
    operationArguments?: OperationArguments;
    /**
     * A function that returns the proper OperationResponseMap for the given OperationSpec and
     * PipelineResponse combination. If this is undefined, then a simple status code lookup will
     * be used.
     */
    operationResponseGetter?: (operationSpec: OperationSpec, response: PipelineResponse) => undefined | OperationResponseMap;
    /**
     * Whether or not the PipelineResponse should be deserialized. Defaults to true.
     */
    shouldDeserialize?: boolean | ((response: PipelineResponse) => boolean);
}

/**
 * Options used when creating and sending HTTP requests for this operation.
 */
export declare interface OperationRequestOptions {
    /**
     * User defined custom request headers that
     * will be applied before the request is sent.
     */
    customHeaders?: {
        [key: string]: string;
    };
    /**
     * The number of milliseconds a request can take before automatically being terminated.
     */
    timeout?: number;
    /**
     * Callback which fires upon upload progress.
     */
    onUploadProgress?: (progress: TransferProgressEvent) => void;
    /**
     * Callback which fires upon download progress.
     */
    onDownloadProgress?: (progress: TransferProgressEvent) => void;
    /**
     * Whether or not the HttpOperationResponse should be deserialized. If this is undefined, then the
     * HttpOperationResponse should be deserialized.
     */
    shouldDeserialize?: boolean | ((response: PipelineResponse) => boolean);
    /**
     * Set to true if the request is sent over HTTP instead of HTTPS
     */
    allowInsecureConnection?: boolean;
}

/**
 * An OperationResponse that can be returned from an operation request for a single status code.
 */
export declare interface OperationResponseMap {
    /**
     * The mapper that will be used to deserialize the response headers.
     */
    headersMapper?: Mapper;
    /**
     * The mapper that will be used to deserialize the response body.
     */
    bodyMapper?: Mapper;
    /**
     * Indicates if this is an error response
     */
    isError?: boolean;
}

/**
 * A specification that defines an operation.
 */
export declare interface OperationSpec {
    /**
     * The serializer to use in this operation.
     */
    readonly serializer: Serializer;
    /**
     * The HTTP method that should be used by requests for this operation.
     */
    readonly httpMethod: HttpMethods;
    /**
     * The URL that was provided in the service's specification. This will still have all of the URL
     * template variables in it. If this is not provided when the OperationSpec is created, then it
     * will be populated by a "baseUri" property on the ServiceClient.
     */
    readonly baseUrl?: string;
    /**
     * The fixed path for this operation's URL. This will still have all of the URL template variables
     * in it.
     */
    readonly path?: string;
    /**
     * The content type of the request body. This value will be used as the "Content-Type" header if
     * it is provided.
     */
    readonly contentType?: string;
    /**
     * The media type of the request body.
     * This value can be used to aide in serialization if it is provided.
     */
    readonly mediaType?: "json" | "xml" | "form" | "binary" | "multipart" | "text" | "unknown" | string;
    /**
     * The parameter that will be used to construct the HTTP request's body.
     */
    readonly requestBody?: OperationParameter;
    /**
     * Whether or not this operation uses XML request and response bodies.
     */
    readonly isXML?: boolean;
    /**
     * The parameters to the operation method that will be substituted into the constructed URL.
     */
    readonly urlParameters?: ReadonlyArray<OperationURLParameter>;
    /**
     * The parameters to the operation method that will be added to the constructed URL's query.
     */
    readonly queryParameters?: ReadonlyArray<OperationQueryParameter>;
    /**
     * The parameters to the operation method that will be converted to headers on the operation's
     * HTTP request.
     */
    readonly headerParameters?: ReadonlyArray<OperationParameter>;
    /**
     * The parameters to the operation method that will be used to create a formdata body for the
     * operation's HTTP request.
     */
    readonly formDataParameters?: ReadonlyArray<OperationParameter>;
    /**
     * The different types of responses that this operation can return based on what status code is
     * returned.
     */
    readonly responses: {
        [responseCode: string]: OperationResponseMap;
    };
}

/**
 * A parameter for an operation that will be substituted into the operation's request URL.
 */
export declare interface OperationURLParameter extends OperationParameter {
    /**
     * Whether or not to skip encoding the URL parameter's value before adding it to the URL.
     */
    skipEncoding?: boolean;
}

/**
 * Encodes how to reach a particular property on an object.
 */
export declare type ParameterPath = string | string[] | {
    [propertyName: string]: ParameterPath;
};

/**
 * Used to disambiguate discriminated type unions.
 * For example, if response can have many shapes but also includes a 'kind' field (or similar),
 * that field can be used to determine how to deserialize the response to the correct type.
 */
export declare interface PolymorphicDiscriminator {
    /**
     * Name of the discriminant property in the original JSON payload, e.g. `@odata.kind`.
     */
    serializedName: string;
    /**
     * Name to use on the resulting object instead of the original property name.
     * Useful since the JSON property could be difficult to work with.
     * For example: For a field received as `@odata.kind`, the final object could instead include a property simply named `kind`.
     */
    clientName: string;
    /**
     * It may contain any other property.
     */
    [key: string]: string;
}

/**
 * The format that will be used to join an array of values together for a query parameter value.
 */
export declare type QueryCollectionFormat = "CSV" | "SSV" | "TSV" | "Pipes" | "Multi";

/**
 * A function to be called each time a response is received from the server
 * while performing the requested operation.
 * May be called multiple times.
 */
export declare type RawResponseCallback = (rawResponse: FullOperationResponse, flatResponse: unknown, error?: unknown) => void;

/**
 * A mapper describing arrays.
 */
export declare interface SequenceMapper extends BaseMapper {
    /**
     * The type descriptor of the `SequenceMapper`.
     */
    type: SequenceMapperType;
}

/**
 * Helps build a mapper that describes how to parse a sequence of mapped values.
 */
export declare interface SequenceMapperType {
    /**
     * Name of the sequence type mapper.
     */
    name: "Sequence";
    /**
     * The mapper to use to map each one of the properties of the sequence.
     */
    element: Mapper;
}

/**
 * This policy handles assembling the request body and headers using
 * an OperationSpec and OperationArguments on the request.
 */
export declare function serializationPolicy(options?: SerializationPolicyOptions): PipelinePolicy;

/**
 * The programmatic identifier of the serializationPolicy.
 */
export declare const serializationPolicyName = "serializationPolicy";

/**
 * Options to configure API request serialization.
 */
export declare interface SerializationPolicyOptions {
    /**
     * A function that is able to write XML. Required for XML support.
     */
    stringifyXML?: (obj: any, opts?: XmlOptions) => string;
    /**
     * Configures behavior of xml parser and builder.
     */
    serializerOptions?: SerializerOptions;
}

/**
 * Used to map raw response objects to final shapes.
 * Helps packing and unpacking Dates and other encoded types that are not intrinsic to JSON.
 * Also allows pulling values from headers, as well as inserting default values and constants.
 */
export declare interface Serializer {
    /**
     * The provided model mapper.
     */
    readonly modelMappers: {
        [key: string]: any;
    };
    /**
     * Whether the contents are XML or not.
     */
    readonly isXML: boolean;
    /**
     * Validates constraints, if any. This function will throw if the provided value does not respect those constraints.
     * @param mapper - The definition of data models.
     * @param value - The value.
     * @param objectName - Name of the object. Used in the error messages.
     * @deprecated Removing the constraints validation on client side.
     */
    validateConstraints(mapper: Mapper, value: any, objectName: string): void;
    /**
     * Serialize the given object based on its metadata defined in the mapper.
     *
     * @param mapper - The mapper which defines the metadata of the serializable object.
     * @param object - A valid Javascript object to be serialized.
     * @param objectName - Name of the serialized object.
     * @param options - additional options to deserialization.
     * @returns A valid serialized Javascript object.
     */
    serialize(mapper: Mapper, object: any, objectName?: string, options?: SerializerOptions): any;
    /**
     * Deserialize the given object based on its metadata defined in the mapper.
     *
     * @param mapper - The mapper which defines the metadata of the serializable object.
     * @param responseBody - A valid Javascript entity to be deserialized.
     * @param objectName - Name of the deserialized object.
     * @param options - Controls behavior of XML parser and builder.
     * @returns A valid deserialized Javascript object.
     */
    deserialize(mapper: Mapper, responseBody: any, objectName: string, options?: SerializerOptions): any;
}

/**
 * Options to configure serialization/de-serialization behavior.
 */
export declare interface SerializerOptions {
    /**
     * Options to configure xml parser/builder behavior.
     */
    xml: XmlOptions;
    /**
     * Normally additional properties are included in the result object, even if there is no mapper for them.
     * This flag disables this behavior when true. It is used when parsing headers to avoid polluting the result object.
     */
    ignoreUnknownProperties?: boolean;
}

/**
 * Initializes a new instance of the ServiceClient.
 */
export declare class ServiceClient {
    /**
     * If specified, this is the base URI that requests will be made against for this ServiceClient.
     * If it is not specified, then all OperationSpecs must contain a baseUrl property.
     */
    private readonly _endpoint?;
    /**
     * The default request content type for the service.
     * Used if no requestContentType is present on an OperationSpec.
     */
    private readonly _requestContentType?;
    /**
     * Set to true if the request is sent over HTTP instead of HTTPS
     */
    private readonly _allowInsecureConnection?;
    /**
     * The HTTP client that will be used to send requests.
     */
    private readonly _httpClient;
    /**
     * The pipeline used by this client to make requests
     */
    readonly pipeline: Pipeline;
    /**
     * The ServiceClient constructor
     * @param credential - The credentials used for authentication with the service.
     * @param options - The service client options that govern the behavior of the client.
     */
    constructor(options?: ServiceClientOptions);
    /**
     * Send the provided httpRequest.
     */
    sendRequest(request: PipelineRequest): Promise<PipelineResponse>;
    /**
     * Send an HTTP request that is populated using the provided OperationSpec.
     * @typeParam T - The typed result of the request, based on the OperationSpec.
     * @param operationArguments - The arguments that the HTTP request's templated values will be populated from.
     * @param operationSpec - The OperationSpec to use to populate the httpRequest.
     */
    sendOperationRequest<T>(operationArguments: OperationArguments, operationSpec: OperationSpec): Promise<T>;
}

/**
 * Options to be provided while creating the client.
 */
export declare interface ServiceClientOptions extends CommonClientOptions {
    /**
     * If specified, this is the base URI that requests will be made against for this ServiceClient.
     * If it is not specified, then all OperationSpecs must contain a baseUrl property.
     * @deprecated This property is deprecated and will be removed soon, please use endpoint instead
     */
    baseUri?: string;
    /**
     * If specified, this is the endpoint that requests will be made against for this ServiceClient.
     * If it is not specified, then all OperationSpecs must contain a baseUrl property.
     * to encourage customer to use endpoint, we mark the baseUri as deprecated.
     */
    endpoint?: string;
    /**
     * If specified, will be used to build the BearerTokenAuthenticationPolicy.
     */
    credentialScopes?: string | string[];
    /**
     * The default request content type for the service.
     * Used if no requestContentType is present on an OperationSpec.
     */
    requestContentType?: string;
    /**
     * Credential used to authenticate the request.
     */
    credential?: TokenCredential;
    /**
     * A customized pipeline to use, otherwise a default one will be created.
     */
    pipeline?: Pipeline;
}

/**
 * The type of a simple mapper.
 */
export declare interface SimpleMapperType {
    /**
     * Name of the type of the property.
     */
    name: "Base64Url" | "Boolean" | "ByteArray" | "Date" | "DateTime" | "DateTimeRfc1123" | "Object" | "Stream" | "String" | "TimeSpan" | "UnixTime" | "Uuid" | "Number" | "any";
}

/**
 * Configuration for creating a new Tracing Span
 */
export declare interface SpanConfig {
    /**
     * Package name prefix
     */
    packagePrefix: string;
    /**
     * Service namespace
     */
    namespace: string;
}

/**
 * Default key used to access the XML attributes.
 */
export declare const XML_ATTRKEY = "$";

/**
 * Default key used to access the XML value content.
 */
export declare const XML_CHARKEY = "_";

/**
 * Options to govern behavior of xml parser and builder.
 */
export declare interface XmlOptions {
    /**
     * indicates the name of the root element in the resulting XML when building XML.
     */
    rootName?: string;
    /**
     * indicates whether the root element is to be included or not in the output when parsing XML.
     */
    includeRoot?: boolean;
    /**
     * key used to access the XML value content when parsing XML.
     */
    xmlCharKey?: string;
}

export { }
