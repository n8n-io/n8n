import { Command as $Command } from "@smithy/smithy-client";
import {
  MetadataBearer as __MetadataBearer,
  StreamingBlobPayloadInputTypes,
} from "@smithy/types";
import { UploadPartOutput, UploadPartRequest } from "../models/models_1";
import {
  S3ClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../S3Client";
export { __MetadataBearer };
export { $Command };
export interface UploadPartCommandInput
  extends Pick<UploadPartRequest, Exclude<keyof UploadPartRequest, "Body">> {
  Body?: StreamingBlobPayloadInputTypes;
}
export interface UploadPartCommandOutput
  extends UploadPartOutput,
    __MetadataBearer {}
declare const UploadPartCommand_base: {
  new (
    input: UploadPartCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    UploadPartCommandInput,
    UploadPartCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: UploadPartCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    UploadPartCommandInput,
    UploadPartCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class UploadPartCommand extends UploadPartCommand_base {
  protected static __types: {
    api: {
      input: UploadPartRequest;
      output: UploadPartOutput;
    };
    sdk: {
      input: UploadPartCommandInput;
      output: UploadPartCommandOutput;
    };
  };
}
