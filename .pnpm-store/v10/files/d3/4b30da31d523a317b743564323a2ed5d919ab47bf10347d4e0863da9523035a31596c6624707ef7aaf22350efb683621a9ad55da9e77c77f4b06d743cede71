import { SmithyRpcV2CborProtocol } from "@smithy/core/cbor";
import {
  EndpointBearer,
  HandlerExecutionContext,
  HttpRequest,
  HttpResponse,
  OperationSchema,
  ResponseMetadata,
  SerdeFunctions,
} from "@smithy/types";
export declare class AwsSmithyRpcV2CborProtocol extends SmithyRpcV2CborProtocol {
  private readonly awsQueryCompatible;
  private readonly mixin;
  constructor({
    defaultNamespace,
    awsQueryCompatible,
  }: {
    defaultNamespace: string;
    awsQueryCompatible?: boolean;
  });
  serializeRequest<Input extends object>(
    operationSchema: OperationSchema,
    input: Input,
    context: HandlerExecutionContext & SerdeFunctions & EndpointBearer
  ): Promise<HttpRequest>;
  protected handleError(
    operationSchema: OperationSchema,
    context: HandlerExecutionContext & SerdeFunctions,
    response: HttpResponse,
    dataObject: any,
    metadata: ResponseMetadata
  ): Promise<never>;
}
