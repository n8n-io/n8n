import { HttpBindingProtocol } from "@smithy/core/protocols";
import type { EndpointBearer, HandlerExecutionContext, HttpRequest as IHttpRequest, HttpResponse as IHttpResponse, MetadataBearer, OperationSchema, ResponseMetadata, SerdeFunctions, ShapeDeserializer, ShapeSerializer } from "@smithy/types";
import { XmlCodec } from "./XmlCodec";
/**
 * @alpha
 */
export declare class AwsRestXmlProtocol extends HttpBindingProtocol {
    private readonly codec;
    protected serializer: ShapeSerializer<string | Uint8Array>;
    protected deserializer: ShapeDeserializer<string | Uint8Array>;
    private readonly mixin;
    constructor(options: {
        defaultNamespace: string;
        xmlNamespace: string;
    });
    getPayloadCodec(): XmlCodec;
    getShapeId(): string;
    serializeRequest<Input extends object>(operationSchema: OperationSchema, input: Input, context: HandlerExecutionContext & SerdeFunctions & EndpointBearer): Promise<IHttpRequest>;
    deserializeResponse<Output extends MetadataBearer>(operationSchema: OperationSchema, context: HandlerExecutionContext & SerdeFunctions, response: IHttpResponse): Promise<Output>;
    protected handleError(operationSchema: OperationSchema, context: HandlerExecutionContext & SerdeFunctions, response: IHttpResponse, dataObject: any, metadata: ResponseMetadata): Promise<never>;
    /**
     * @override
     */
    protected getDefaultContentType(): string;
}
