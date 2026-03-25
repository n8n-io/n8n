import { AwsJsonRpcProtocol } from "./AwsJsonRpcProtocol";
export class AwsJson1_1Protocol extends AwsJsonRpcProtocol {
    constructor({ defaultNamespace, serviceTarget, awsQueryCompatible, }) {
        super({
            defaultNamespace,
            serviceTarget,
            awsQueryCompatible,
        });
    }
    getShapeId() {
        return "aws.protocols#awsJson1_1";
    }
    getJsonRpcVersion() {
        return "1.1";
    }
    getDefaultContentType() {
        return "application/x-amz-json-1.1";
    }
}
