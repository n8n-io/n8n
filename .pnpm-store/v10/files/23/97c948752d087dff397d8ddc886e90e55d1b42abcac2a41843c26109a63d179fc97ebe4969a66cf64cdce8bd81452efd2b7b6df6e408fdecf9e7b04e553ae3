import { type TypeRegistry, NormalizedSchema } from "@smithy/core/schema";
import { HttpRequest } from "@smithy/protocol-http";
import type { EndpointBearer, HandlerExecutionContext, HttpRequest as IHttpRequest, HttpResponse as IHttpResponse, MetadataBearer, OperationSchema, Schema, SerdeFunctions } from "@smithy/types";
import { HttpProtocol } from "./HttpProtocol";
/**
 * Base for HTTP-binding protocols. Downstream examples
 * include AWS REST JSON and AWS REST XML.
 *
 * @public
 */
export declare abstract class HttpBindingProtocol extends HttpProtocol {
    /**
     * @override
     */
    protected compositeErrorRegistry: TypeRegistry;
    serializeRequest<Input extends object>(operationSchema: OperationSchema, _input: Input, context: HandlerExecutionContext & SerdeFunctions & EndpointBearer): Promise<IHttpRequest>;
    protected serializeQuery(ns: NormalizedSchema, data: any, query: HttpRequest["query"]): void;
    deserializeResponse<Output extends MetadataBearer>(operationSchema: OperationSchema, context: HandlerExecutionContext & SerdeFunctions, response: IHttpResponse): Promise<Output>;
    /**
     * The base method ignores HTTP bindings.
     *
     * @deprecated (only this signature) use signature without headerBindings.
     * @override
     */
    protected deserializeHttpMessage(schema: Schema, context: HandlerExecutionContext & SerdeFunctions, response: IHttpResponse, headerBindings: Set<string>, dataObject: any): Promise<string[] & {
        discardResponseBody?: boolean;
    }>;
    protected deserializeHttpMessage(schema: Schema, context: HandlerExecutionContext & SerdeFunctions, response: IHttpResponse, dataObject: any): Promise<string[] & {
        discardResponseBody?: boolean;
    }>;
}
