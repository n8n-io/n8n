import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  UploadPartCopyOutput,
  UploadPartCopyRequest,
} from "../models/models_1";
import {
  S3ClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../S3Client";
export { __MetadataBearer };
export { $Command };
export interface UploadPartCopyCommandInput extends UploadPartCopyRequest {}
export interface UploadPartCopyCommandOutput
  extends UploadPartCopyOutput,
    __MetadataBearer {}
declare const UploadPartCopyCommand_base: {
  new (
    input: UploadPartCopyCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    UploadPartCopyCommandInput,
    UploadPartCopyCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: UploadPartCopyCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    UploadPartCopyCommandInput,
    UploadPartCopyCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class UploadPartCopyCommand extends UploadPartCopyCommand_base {
  protected static __types: {
    api: {
      input: UploadPartCopyRequest;
      output: UploadPartCopyOutput;
    };
    sdk: {
      input: UploadPartCopyCommandInput;
      output: UploadPartCopyCommandOutput;
    };
  };
}
