import type { EndpointBearer, HandlerExecutionContext, HttpRequest as IHttpRequest, HttpResponse as IHttpResponse, MetadataBearer, OperationSchema, SerdeFunctions } from "@smithy/types";
import { HttpProtocol } from "./HttpProtocol";
/**
 * Abstract base for RPC-over-HTTP protocols.
 *
 * @public
 */
export declare abstract class RpcProtocol extends HttpProtocol {
    serializeRequest<Input extends object>(operationSchema: OperationSchema, input: Input, context: HandlerExecutionContext & SerdeFunctions & EndpointBearer): Promise<IHttpRequest>;
    deserializeResponse<Output extends MetadataBearer>(operationSchema: OperationSchema, context: HandlerExecutionContext & SerdeFunctions, response: IHttpResponse): Promise<Output>;
}
