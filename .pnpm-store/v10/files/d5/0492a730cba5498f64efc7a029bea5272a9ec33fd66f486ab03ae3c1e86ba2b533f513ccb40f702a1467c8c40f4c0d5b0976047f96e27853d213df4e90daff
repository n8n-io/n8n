import { RpcProtocol } from "@smithy/core/protocols";
import type { Codec, EndpointBearer, HandlerExecutionContext, HttpRequest, HttpResponse as IHttpResponse, MetadataBearer, OperationSchema, ResponseMetadata, SerdeFunctions } from "@smithy/types";
import { XmlShapeDeserializer } from "../xml/XmlShapeDeserializer";
import { QueryShapeSerializer } from "./QueryShapeSerializer";
/**
 * @public
 */
export declare class AwsQueryProtocol extends RpcProtocol {
    options: {
        defaultNamespace: string;
        xmlNamespace: string;
        version: string;
    };
    protected serializer: QueryShapeSerializer;
    protected deserializer: XmlShapeDeserializer;
    private readonly mixin;
    constructor(options: {
        defaultNamespace: string;
        xmlNamespace: string;
        version: string;
    });
    getShapeId(): string;
    setSerdeContext(serdeContext: SerdeFunctions): void;
    getPayloadCodec(): Codec<any, any>;
    serializeRequest<Input extends object>(operationSchema: OperationSchema, input: Input, context: HandlerExecutionContext & SerdeFunctions & EndpointBearer): Promise<HttpRequest>;
    deserializeResponse<Output extends MetadataBearer>(operationSchema: OperationSchema, context: HandlerExecutionContext & SerdeFunctions, response: IHttpResponse): Promise<Output>;
    /**
     * EC2 Query overrides this.
     */
    protected useNestedResult(): boolean;
    /**
     * override
     */
    protected handleError(operationSchema: OperationSchema, context: HandlerExecutionContext & SerdeFunctions, response: IHttpResponse, dataObject: any, metadata: ResponseMetadata): Promise<never>;
    /**
     * The variations in the error and error message locations are attributed to
     * divergence between AWS Query and EC2 Query behavior.
     */
    protected loadQueryErrorCode(output: IHttpResponse, data: any): string | undefined;
    protected loadQueryError(data: any): any | undefined;
    protected loadQueryErrorMessage(data: any): string;
    /**
     * @override
     */
    protected getDefaultContentType(): string;
}
