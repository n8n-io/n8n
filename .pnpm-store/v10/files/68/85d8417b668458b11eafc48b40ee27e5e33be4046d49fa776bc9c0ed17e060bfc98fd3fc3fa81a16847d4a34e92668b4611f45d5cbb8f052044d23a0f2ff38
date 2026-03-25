import { HttpBindingProtocol } from "@smithy/core/protocols";
import type { EndpointBearer, HandlerExecutionContext, HttpRequest, HttpResponse, OperationSchema, ResponseMetadata, SerdeFunctions, ShapeDeserializer, ShapeSerializer } from "@smithy/types";
import { JsonCodec } from "./JsonCodec";
/**
 * @alpha
 */
export declare class AwsRestJsonProtocol extends HttpBindingProtocol {
    protected serializer: ShapeSerializer<string | Uint8Array>;
    protected deserializer: ShapeDeserializer<string | Uint8Array>;
    private readonly codec;
    private readonly mixin;
    constructor({ defaultNamespace }: {
        defaultNamespace: string;
    });
    getShapeId(): string;
    getPayloadCodec(): JsonCodec;
    setSerdeContext(serdeContext: SerdeFunctions): void;
    serializeRequest<Input extends object>(operationSchema: OperationSchema, input: Input, context: HandlerExecutionContext & SerdeFunctions & EndpointBearer): Promise<HttpRequest>;
    protected handleError(operationSchema: OperationSchema, context: HandlerExecutionContext & SerdeFunctions, response: HttpResponse, dataObject: any, metadata: ResponseMetadata): Promise<never>;
    /**
     * @override
     */
    protected getDefaultContentType(): string;
}
