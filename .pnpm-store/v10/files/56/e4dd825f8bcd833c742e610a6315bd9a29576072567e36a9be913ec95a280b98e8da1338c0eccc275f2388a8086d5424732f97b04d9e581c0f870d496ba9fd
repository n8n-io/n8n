import { loadSmithyRpcV2CborErrorCode, SmithyRpcV2CborProtocol } from "@smithy/core/cbor";
import { NormalizedSchema, TypeRegistry } from "@smithy/core/schema";
import { ProtocolLib } from "../ProtocolLib";
export class AwsSmithyRpcV2CborProtocol extends SmithyRpcV2CborProtocol {
    awsQueryCompatible;
    mixin = new ProtocolLib();
    constructor({ defaultNamespace, awsQueryCompatible, }) {
        super({ defaultNamespace });
        this.awsQueryCompatible = !!awsQueryCompatible;
    }
    async serializeRequest(operationSchema, input, context) {
        const request = await super.serializeRequest(operationSchema, input, context);
        if (this.awsQueryCompatible) {
            request.headers["x-amzn-query-mode"] = "true";
        }
        return request;
    }
    async handleError(operationSchema, context, response, dataObject, metadata) {
        if (this.awsQueryCompatible) {
            this.mixin.setQueryCompatError(dataObject, response);
        }
        const errorName = loadSmithyRpcV2CborErrorCode(response, dataObject) ?? "Unknown";
        const { errorSchema, errorMetadata } = await this.mixin.getErrorSchemaOrThrowBaseException(errorName, this.options.defaultNamespace, response, dataObject, metadata);
        const ns = NormalizedSchema.of(errorSchema);
        const message = dataObject.message ?? dataObject.Message ?? "Unknown";
        const ErrorCtor = TypeRegistry.for(errorSchema[1]).getErrorCtor(errorSchema) ?? Error;
        const exception = new ErrorCtor(message);
        const output = {};
        for (const [name, member] of ns.structIterator()) {
            output[name] = this.deserializer.readValue(member, dataObject[name]);
        }
        if (this.awsQueryCompatible) {
            this.mixin.queryCompatOutput(dataObject, output);
        }
        throw Object.assign(exception, errorMetadata, {
            $fault: ns.getMergedTraits().error,
            message,
        }, output);
    }
}
