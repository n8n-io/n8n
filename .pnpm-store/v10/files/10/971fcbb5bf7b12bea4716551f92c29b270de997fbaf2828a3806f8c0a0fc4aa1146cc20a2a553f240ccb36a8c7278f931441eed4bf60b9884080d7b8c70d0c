import { HttpBindingProtocol } from "@smithy/core/protocols";
import { TypeRegistry } from "@smithy/core/schema";
import {
  EndpointBearer,
  HandlerExecutionContext,
  HttpRequest,
  HttpResponse,
  MetadataBearer,
  OperationSchema,
  ResponseMetadata,
  SerdeFunctions,
  ShapeDeserializer,
  ShapeSerializer,
} from "@smithy/types";
import { JsonCodec } from "./JsonCodec";
export declare class AwsRestJsonProtocol extends HttpBindingProtocol {
  protected serializer: ShapeSerializer<string | Uint8Array>;
  protected deserializer: ShapeDeserializer<string | Uint8Array>;
  private readonly codec;
  private readonly mixin;
  constructor({
    defaultNamespace,
    errorTypeRegistries,
  }: {
    defaultNamespace: string;
    errorTypeRegistries?: TypeRegistry[];
  });
  getShapeId(): string;
  getPayloadCodec(): JsonCodec;
  setSerdeContext(serdeContext: SerdeFunctions): void;
  serializeRequest<Input extends object>(
    operationSchema: OperationSchema,
    input: Input,
    context: HandlerExecutionContext & SerdeFunctions & EndpointBearer
  ): Promise<HttpRequest>;
  deserializeResponse<Output extends MetadataBearer>(
    operationSchema: OperationSchema,
    context: HandlerExecutionContext & SerdeFunctions,
    response: HttpResponse
  ): Promise<Output>;
  protected handleError(
    operationSchema: OperationSchema,
    context: HandlerExecutionContext & SerdeFunctions,
    response: HttpResponse,
    dataObject: any,
    metadata: ResponseMetadata
  ): Promise<never>;
  protected getDefaultContentType(): string;
}
