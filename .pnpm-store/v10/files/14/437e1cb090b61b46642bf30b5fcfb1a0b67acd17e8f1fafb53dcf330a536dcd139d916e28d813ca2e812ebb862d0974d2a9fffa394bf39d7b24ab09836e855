import { NormalizedSchema, TypeRegistry } from "@smithy/core/schema";
import { ServiceException as SDKBaseServiceException } from "@smithy/smithy-client";
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
}
export {};
