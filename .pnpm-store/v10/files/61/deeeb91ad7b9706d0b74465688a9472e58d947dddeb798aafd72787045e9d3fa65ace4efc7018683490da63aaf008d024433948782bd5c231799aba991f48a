import { RpcProtocol } from "@smithy/core/protocols";
import { TypeRegistry } from "@smithy/core/schema";
import { EndpointBearer, HandlerExecutionContext, HttpRequest as IHttpRequest, HttpResponse as IHttpResponse, MetadataBearer, OperationSchema, ResponseMetadata, SerdeFunctions } from "@smithy/types";
import { CborCodec } from "./CborCodec";
/**
 * Client protocol for Smithy RPCv2 CBOR.
 *
 * @public
 */
export declare class SmithyRpcV2CborProtocol extends RpcProtocol {
    /**
     * @override
     */
    protected compositeErrorRegistry: TypeRegistry;
    private codec;
    protected serializer: import("./CborCodec").CborShapeSerializer;
    protected deserializer: import("./CborCodec").CborShapeDeserializer;
    constructor({ defaultNamespace, errorTypeRegistries, }: {
        defaultNamespace: string;
        errorTypeRegistries?: TypeRegistry[];
    });
    getShapeId(): string;
    getPayloadCodec(): CborCodec;
    serializeRequest<Input extends object>(operationSchema: OperationSchema, input: Input, context: HandlerExecutionContext & SerdeFunctions & EndpointBearer): Promise<IHttpRequest>;
    deserializeResponse<Output extends MetadataBearer>(operationSchema: OperationSchema, context: HandlerExecutionContext & SerdeFunctions, response: IHttpResponse): Promise<Output>;
    protected handleError(operationSchema: OperationSchema, context: HandlerExecutionContext & SerdeFunctions, response: IHttpResponse, dataObject: any, metadata: ResponseMetadata): Promise<never>;
    protected getDefaultContentType(): string;
}
