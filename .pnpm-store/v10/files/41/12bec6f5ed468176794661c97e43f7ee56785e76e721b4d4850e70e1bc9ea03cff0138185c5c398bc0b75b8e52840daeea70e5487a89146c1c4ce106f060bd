import { SmithyRpcV2CborProtocol } from "@smithy/core/cbor";
import type { EndpointBearer, HandlerExecutionContext, HttpRequest, HttpResponse, OperationSchema, ResponseMetadata, SerdeFunctions } from "@smithy/types";
/**
 * Extends the Smithy implementation to add AwsQueryCompatibility support.
 *
 * @public
 */
export declare class AwsSmithyRpcV2CborProtocol extends SmithyRpcV2CborProtocol {
    private readonly awsQueryCompatible;
    private readonly mixin;
    constructor({ defaultNamespace, awsQueryCompatible, }: {
        defaultNamespace: string;
        awsQueryCompatible?: boolean;
    });
    /**
     * @override
     */
    serializeRequest<Input extends object>(operationSchema: OperationSchema, input: Input, context: HandlerExecutionContext & SerdeFunctions & EndpointBearer): Promise<HttpRequest>;
    /**
     * @override
     */
    protected handleError(operationSchema: OperationSchema, context: HandlerExecutionContext & SerdeFunctions, response: HttpResponse, dataObject: any, metadata: ResponseMetadata): Promise<never>;
}
