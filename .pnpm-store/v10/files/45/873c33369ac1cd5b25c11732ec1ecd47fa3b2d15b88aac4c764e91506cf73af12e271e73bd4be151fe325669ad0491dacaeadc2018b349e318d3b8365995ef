import { TypeRegistry } from "@smithy/core/schema";
import { AwsQueryProtocol } from "./AwsQueryProtocol";
export declare class AwsEc2QueryProtocol extends AwsQueryProtocol {
  options: {
    defaultNamespace: string;
    xmlNamespace: string;
    version: string;
    errorTypeRegistries?: TypeRegistry[];
  };
  constructor(options: {
    defaultNamespace: string;
    xmlNamespace: string;
    version: string;
    errorTypeRegistries?: TypeRegistry[];
  });
  getShapeId(): string;
  protected useNestedResult(): boolean;
}
