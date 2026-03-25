import { NormalizedSchema, TypeRegistry } from "@smithy/core/schema";
import {
  HttpResponse as IHttpResponse,
  MetadataBearer,
  ResponseMetadata,
  StaticErrorSchema,
} from "@smithy/types";
type ErrorMetadataBearer = MetadataBearer & {
  $response: IHttpResponse;
  $fault: "client" | "server";
};
export declare class ProtocolLib {
  resolveRestContentType(
    defaultContentType: string,
    inputSchema: NormalizedSchema
  ): string | undefined;
  getErrorSchemaOrThrowBaseException(
    errorIdentifier: string,
    defaultNamespace: string,
    response: IHttpResponse,
    dataObject: any,
    metadata: ResponseMetadata,
    getErrorSchema?: (
      registry: TypeRegistry,
      errorName: string
    ) => StaticErrorSchema
  ): Promise<{
    errorSchema: StaticErrorSchema;
    errorMetadata: ErrorMetadataBearer;
  }>;
  setQueryCompatError(
    output: Record<string, any>,
    response: IHttpResponse
  ): void;
  queryCompatOutput(queryCompatErrorData: any, errorData: any): void;
}
export {};
