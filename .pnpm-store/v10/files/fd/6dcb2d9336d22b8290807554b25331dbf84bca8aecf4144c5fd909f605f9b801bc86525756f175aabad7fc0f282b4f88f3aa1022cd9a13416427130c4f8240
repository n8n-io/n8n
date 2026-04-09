import { EventStreamSerde } from "@smithy/core/event-streams";
import { NormalizedSchema, TypeRegistry } from "@smithy/core/schema";
import { ClientProtocol, Codec, Endpoint, EndpointBearer, EndpointV2, EventStreamMarshaller, HandlerExecutionContext, HttpRequest as IHttpRequest, HttpResponse as IHttpResponse, MetadataBearer, OperationSchema, ResponseMetadata, Schema, SerdeFunctions, ShapeDeserializer, ShapeSerializer } from "@smithy/types";
import { SerdeContext } from "./SerdeContext";
/**
 * Abstract base for HTTP-based client protocols.
 *
 * @public
 */
export declare abstract class HttpProtocol extends SerdeContext implements ClientProtocol<IHttpRequest, IHttpResponse> {
    readonly options: {
        defaultNamespace: string;
        errorTypeRegistries?: TypeRegistry[];
    };
    /**
     * An error registry having the namespace of the modeled service,
     * but combining all error schemas found within the service closure.
     *
     * Used to look up error schema during deserialization.
     */
    protected compositeErrorRegistry: TypeRegistry;
    protected abstract serializer: ShapeSerializer<string | Uint8Array>;
    protected abstract deserializer: ShapeDeserializer<string | Uint8Array>;
    /**
     * @param options.defaultNamespace - used by various implementing classes.
     * @param options.errorTypeRegistries - registry instances that contribute to error deserialization.
     */
    protected constructor(options: {
        defaultNamespace: string;
        errorTypeRegistries?: TypeRegistry[];
    });
    abstract getShapeId(): string;
    abstract getPayloadCodec(): Codec<any, any>;
    getRequestType(): new (...args: any[]) => IHttpRequest;
    getResponseType(): new (...args: any[]) => IHttpResponse;
    /**
     * @override
     */
    setSerdeContext(serdeContext: SerdeFunctions): void;
    abstract serializeRequest<Input extends object>(operationSchema: OperationSchema, input: Input, context: HandlerExecutionContext & SerdeFunctions & EndpointBearer): Promise<IHttpRequest>;
    updateServiceEndpoint(request: IHttpRequest, endpoint: EndpointV2 | Endpoint): IHttpRequest;
    abstract deserializeResponse<Output extends MetadataBearer>(operationSchema: OperationSchema, context: HandlerExecutionContext & SerdeFunctions, response: IHttpResponse): Promise<Output>;
    protected setHostPrefix<Input extends object>(request: IHttpRequest, operationSchema: OperationSchema, input: Input): void;
    protected abstract handleError(operationSchema: OperationSchema, context: HandlerExecutionContext & SerdeFunctions, response: IHttpResponse, dataObject: any, metadata: ResponseMetadata): Promise<never>;
    protected deserializeMetadata(output: IHttpResponse): ResponseMetadata;
    /**
     * @param eventStream - the iterable provided by the caller.
     * @param requestSchema - the schema of the event stream container (struct).
     * @param [initialRequest] - only provided if the initial-request is part of the event stream (RPC).
     *
     * @returns a stream suitable for the HTTP body of a request.
     */
    protected serializeEventStream({ eventStream, requestSchema, initialRequest, }: {
        eventStream: AsyncIterable<any>;
        requestSchema: NormalizedSchema;
        initialRequest?: any;
    }): Promise<IHttpRequest["body"]>;
    /**
     * @param response - http response from which to read the event stream.
     * @param unionSchema - schema of the event stream container (struct).
     * @param [initialResponseContainer] - provided and written to only if the initial response is part of the event stream (RPC).
     *
     * @returns the asyncIterable of the event stream.
     */
    protected deserializeEventStream({ response, responseSchema, initialResponseContainer, }: {
        response: IHttpResponse;
        responseSchema: NormalizedSchema;
        initialResponseContainer?: any;
    }): Promise<AsyncIterable<{
        [key: string]: any;
        $unknown?: unknown;
    }>>;
    /**
     * Loads eventStream capability async (for chunking).
     */
    protected loadEventStreamCapability(): Promise<EventStreamSerde>;
    /**
     * @returns content-type default header value for event stream events and other documents.
     */
    protected getDefaultContentType(): string;
    /**
     * For HTTP binding protocols, this method is overridden in {@link HttpBindingProtocol}.
     *
     * @deprecated only use this for HTTP binding protocols.
     */
    protected deserializeHttpMessage(schema: Schema, context: HandlerExecutionContext & SerdeFunctions, response: IHttpResponse, headerBindings: Set<string>, dataObject: any): Promise<string[]>;
    protected deserializeHttpMessage(schema: Schema, context: HandlerExecutionContext & SerdeFunctions, response: IHttpResponse, dataObject: any): Promise<string[]>;
    protected getEventStreamMarshaller(): EventStreamMarshaller;
}
