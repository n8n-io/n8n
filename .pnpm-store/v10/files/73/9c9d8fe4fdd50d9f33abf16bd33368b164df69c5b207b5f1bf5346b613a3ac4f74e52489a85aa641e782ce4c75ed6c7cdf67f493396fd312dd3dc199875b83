import { CommonClientOptions, OperationArguments, OperationSpec } from "./interfaces.js";
import { Pipeline, PipelineRequest, PipelineResponse } from "@azure/core-rest-pipeline";
import { TokenCredential } from "@azure/core-auth";
/**
 * Options to be provided while creating the client.
 */
export interface ServiceClientOptions extends CommonClientOptions {
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
//# sourceMappingURL=serviceClient.d.ts.map