import { AwsJsonRpcProtocol } from "./AwsJsonRpcProtocol";
export class AwsJson1_0Protocol extends AwsJsonRpcProtocol {
    constructor({ defaultNamespace, errorTypeRegistries, serviceTarget, awsQueryCompatible, jsonCodec, }) {
        super({
            defaultNamespace,
            errorTypeRegistries,
            serviceTarget,
            awsQueryCompatible,
            jsonCodec,
        });
    }
    getShapeId() {
        return "aws.protocols#awsJson1_0";
    }
    getJsonRpcVersion() {
        return "1.0";
    }
    getDefaultContentType() {
        return "application/x-amz-json-1.0";
    }
}
