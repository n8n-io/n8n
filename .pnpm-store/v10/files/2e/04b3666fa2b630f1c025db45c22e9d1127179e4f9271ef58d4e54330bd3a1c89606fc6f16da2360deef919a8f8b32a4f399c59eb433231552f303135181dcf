import { NormalizedSchema, TypeRegistry } from "@smithy/core/schema";
import { ServiceException as SDKBaseServiceException } from "@smithy/smithy-client";
import {
  HttpResponse as IHttpResponse,
  MetadataBearer,
  ResponseMetadata,
  StaticErrorSchema,
} from "@smithy/types";
type ErrorMetadataBearer = MetadataBearer & {
  $fault: "client" | "server";
};
export declare class ProtocolLib {
  private queryCompat;
  private errorRegistry?;
  constructor(queryCompat?: boolean);
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
  compose(
    composite: TypeRegistry,
    errorIdentifier: string,
    defaultNamespace: string
  ): void;
  decorateServiceException<E extends SDKBaseServiceException>(
    exception: E,
    additions?: Record<string, any>
  ): E;
  setQueryCompatError(
    output: Record<string, any>,
    response: IHttpResponse
  ): void;
  queryCompatOutput(queryCompatErrorData: any, errorData: any): void;
  findQueryCompatibleError(
    registry: TypeRegistry,
    errorName: string
  ): StaticErrorSchema;
}
export {};
