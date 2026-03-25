import { Command as $Command } from "@smithy/smithy-client";
import {
  MetadataBearer as __MetadataBearer,
  StreamingBlobPayloadInputTypes,
} from "@smithy/types";
import { PutObjectOutput, PutObjectRequest } from "../models/models_1";
import {
  S3ClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../S3Client";
export { __MetadataBearer };
export { $Command };
export interface PutObjectCommandInput
  extends Pick<PutObjectRequest, Exclude<keyof PutObjectRequest, "Body">> {
  Body?: StreamingBlobPayloadInputTypes;
}
export interface PutObjectCommandOutput
  extends PutObjectOutput,
    __MetadataBearer {}
declare const PutObjectCommand_base: {
  new (
    input: PutObjectCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    PutObjectCommandInput,
    PutObjectCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: PutObjectCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    PutObjectCommandInput,
    PutObjectCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class PutObjectCommand extends PutObjectCommand_base {
  protected static __types: {
    api: {
      input: PutObjectRequest;
      output: PutObjectOutput;
    };
    sdk: {
      input: PutObjectCommandInput;
      output: PutObjectCommandOutput;
    };
  };
}
