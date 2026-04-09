import { NormalizedSchema, TypeRegistry } from "@smithy/core/schema";
import type { ServiceException as SDKBaseServiceException } from "@smithy/smithy-client";
import type { HttpResponse as IHttpResponse, MetadataBearer, ResponseMetadata, StaticErrorSchema } from "@smithy/types";
/**
 * @internal
 */
type ErrorMetadataBearer = MetadataBearer & {
    $fault: "client" | "server";
};
/**
 * Shared code for Protocols.
 *
 * @internal
 */
export declare class ProtocolLib {
    private queryCompat;
    private errorRegistry?;
    constructor(queryCompat?: boolean);
    /**
     * This is only for REST protocols.
     *
     * @param defaultContentType - of the protocol.
     * @param inputSchema - schema for which to determine content type.
     *
     * @returns content-type header value or undefined when not applicable.
     */
    resolveRestContentType(defaultContentType: string, inputSchema: NormalizedSchema): string | undefined;
    /**
     * Shared code for finding error schema or throwing an unmodeled base error.
     * @returns error schema and error metadata.
     *
     * @throws ServiceBaseException or generic Error if no error schema could be found.
     */
    getErrorSchemaOrThrowBaseException(errorIdentifier: string, defaultNamespace: string, response: IHttpResponse, dataObject: any, metadata: ResponseMetadata, getErrorSchema?: (registry: TypeRegistry, errorName: string) => StaticErrorSchema): Promise<{
        errorSchema: StaticErrorSchema;
        errorMetadata: ErrorMetadataBearer;
    }>;
    /**
     * This method exists because in older clients, no `errorTypeRegistries` array is provided to the Protocol
     * implementation. This means that the TypeRegistry queried by the error's namespace or the service's defaultNamespace
     * must be composed into the possibly-empty local compositeErrorRegistry.
     *
     *
     * @param composite - TypeRegistry instance local to instances of HttpProtocol. In newer clients, this instance directly
     * receives the error registries exported by the client.
     * @param errorIdentifier - parsed from the response, used to look up the error schema within the registry.
     * @param defaultNamespace - property of the Protocol implementation pointing to a specific service.
     */
    compose(composite: TypeRegistry, errorIdentifier: string, defaultNamespace: string): void;
    /**
     * Assigns additions onto exception if not already present.
     */
    decorateServiceException<E extends SDKBaseServiceException>(exception: E, additions?: Record<string, any>): E;
    /**
     * Reads the x-amzn-query-error header for awsQuery compatibility.
     *
     * @param output - values that will be assigned to an error object.
     * @param response - from which to read awsQueryError headers.
     */
    setQueryCompatError(output: Record<string, any>, response: IHttpResponse): void;
    /**
     * Assigns Error, Type, Code from the awsQuery error object to the output error object.
     * @param queryCompatErrorData - query compat error object.
     * @param errorData - canonical error object returned to the caller.
     */
    queryCompatOutput(queryCompatErrorData: any, errorData: any): void;
    /**
     * Finds the canonical modeled error using the awsQueryError alias.
     * @param registry - service error registry.
     * @param errorName - awsQueryError name or regular qualified shapeId.
     */
    findQueryCompatibleError(registry: TypeRegistry, errorName: string): StaticErrorSchema;
}
export {};
