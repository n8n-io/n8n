import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { HeadBucketOutput, HeadBucketRequest } from "../models/models_0";
import {
  S3ClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../S3Client";
export { __MetadataBearer };
export { $Command };
export interface HeadBucketCommandInput extends HeadBucketRequest {}
export interface HeadBucketCommandOutput
  extends HeadBucketOutput,
    __MetadataBearer {}
declare const HeadBucketCommand_base: {
  new (
    input: HeadBucketCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    HeadBucketCommandInput,
    HeadBucketCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: HeadBucketCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    HeadBucketCommandInput,
    HeadBucketCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class HeadBucketCommand extends HeadBucketCommand_base {
  protected static __types: {
    api: {
      input: HeadBucketRequest;
      output: HeadBucketOutput;
    };
    sdk: {
      input: HeadBucketCommandInput;
      output: HeadBucketCommandOutput;
    };
  };
}
