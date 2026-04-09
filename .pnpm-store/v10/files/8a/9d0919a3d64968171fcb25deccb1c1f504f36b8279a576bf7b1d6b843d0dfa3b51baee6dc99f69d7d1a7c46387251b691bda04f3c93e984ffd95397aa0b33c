import { RpcProtocol } from "@smithy/core/protocols";
import { deref, NormalizedSchema } from "@smithy/core/schema";
import { ProtocolLib } from "../ProtocolLib";
import { JsonCodec } from "./JsonCodec";
import { loadRestJsonErrorCode } from "./parseJsonBody";
export class AwsJsonRpcProtocol extends RpcProtocol {
    serializer;
    deserializer;
    serviceTarget;
    codec;
    mixin;
    awsQueryCompatible;
    constructor({ defaultNamespace, errorTypeRegistries, serviceTarget, awsQueryCompatible, jsonCodec, }) {
        super({
            defaultNamespace,
            errorTypeRegistries,
        });
        this.serviceTarget = serviceTarget;
        this.codec =
            jsonCodec ??
                new JsonCodec({
                    timestampFormat: {
                        useTrait: true,
                        default: 7,
                    },
                    jsonName: false,
                });
        this.serializer = this.codec.createSerializer();
        this.deserializer = this.codec.createDeserializer();
        this.awsQueryCompatible = !!awsQueryCompatible;
        this.mixin = new ProtocolLib(this.awsQueryCompatible);
    }
    async serializeRequest(operationSchema, input, context) {
        const request = await super.serializeRequest(operationSchema, input, context);
        if (!request.path.endsWith("/")) {
            request.path += "/";
        }
        Object.assign(request.headers, {
            "content-type": `application/x-amz-json-${this.getJsonRpcVersion()}`,
            "x-amz-target": `${this.serviceTarget}.${operationSchema.name}`,
        });
        if (this.awsQueryCompatible) {
            request.headers["x-amzn-query-mode"] = "true";
        }
        if (deref(operationSchema.input) === "unit" || !request.body) {
            request.body = "{}";
        }
        return request;
    }
    getPayloadCodec() {
        return this.codec;
    }
    async handleError(operationSchema, context, response, dataObject, metadata) {
        if (this.awsQueryCompatible) {
            this.mixin.setQueryCompatError(dataObject, response);
        }
        const errorIdentifier = loadRestJsonErrorCode(response, dataObject) ?? "Unknown";
        this.mixin.compose(this.compositeErrorRegistry, errorIdentifier, this.options.defaultNamespace);
        const { errorSchema, errorMetadata } = await this.mixin.getErrorSchemaOrThrowBaseException(errorIdentifier, this.options.defaultNamespace, response, dataObject, metadata, this.awsQueryCompatible ? this.mixin.findQueryCompatibleError : undefined);
        const ns = NormalizedSchema.of(errorSchema);
        const message = dataObject.message ?? dataObject.Message ?? "UnknownError";
        const ErrorCtor = this.compositeErrorRegistry.getErrorCtor(errorSchema) ?? Error;
        const exception = new ErrorCtor(message);
        const output = {};
        for (const [name, member] of ns.structIterator()) {
            if (dataObject[name] != null) {
                output[name] = this.codec.createDeserializer().readObject(member, dataObject[name]);
            }
        }
        if (this.awsQueryCompatible) {
            this.mixin.queryCompatOutput(dataObject, output);
        }
        throw this.mixin.decorateServiceException(Object.assign(exception, errorMetadata, {
            $fault: ns.getMergedTraits().error,
            message,
        }, output), dataObject);
    }
}
