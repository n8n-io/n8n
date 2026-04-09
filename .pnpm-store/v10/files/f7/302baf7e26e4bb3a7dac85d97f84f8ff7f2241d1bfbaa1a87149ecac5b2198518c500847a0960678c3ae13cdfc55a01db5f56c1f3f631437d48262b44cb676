import { TypeRegistry } from "@smithy/core/schema";
import { AwsJsonRpcProtocol } from "./AwsJsonRpcProtocol";
import { JsonCodec } from "./JsonCodec";
export declare class AwsJson1_0Protocol extends AwsJsonRpcProtocol {
  constructor({
    defaultNamespace,
    errorTypeRegistries,
    serviceTarget,
    awsQueryCompatible,
    jsonCodec,
  }: {
    defaultNamespace: string;
    errorTypeRegistries?: TypeRegistry[];
    serviceTarget: string;
    awsQueryCompatible?: boolean;
    jsonCodec?: JsonCodec;
  });
  getShapeId(): string;
  protected getJsonRpcVersion(): "1.0";
  protected getDefaultContentType(): string;
}
