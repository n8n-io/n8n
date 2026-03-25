import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  GetBucketPolicyOutput,
  GetBucketPolicyRequest,
} from "../models/models_0";
import {
  S3ClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../S3Client";
export { __MetadataBearer };
export { $Command };
export interface GetBucketPolicyCommandInput extends GetBucketPolicyRequest {}
export interface GetBucketPolicyCommandOutput
  extends GetBucketPolicyOutput,
    __MetadataBearer {}
declare const GetBucketPolicyCommand_base: {
  new (
    input: GetBucketPolicyCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    GetBucketPolicyCommandInput,
    GetBucketPolicyCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: GetBucketPolicyCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    GetBucketPolicyCommandInput,
    GetBucketPolicyCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class GetBucketPolicyCommand extends GetBucketPolicyCommand_base {
  protected static __types: {
    api: {
      input: GetBucketPolicyRequest;
      output: GetBucketPolicyOutput;
    };
    sdk: {
      input: GetBucketPolicyCommandInput;
      output: GetBucketPolicyCommandOutput;
    };
  };
}
