import { AwsJsonRpcProtocol } from "./AwsJsonRpcProtocol";
export class AwsJson1_0Protocol extends AwsJsonRpcProtocol {
    constructor({ defaultNamespace, serviceTarget, awsQueryCompatible, }) {
        super({
            defaultNamespace,
            serviceTarget,
            awsQueryCompatible,
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
