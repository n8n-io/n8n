import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  GetBucketLocationOutput,
  GetBucketLocationRequest,
} from "../models/models_0";
import {
  S3ClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../S3Client";
export { __MetadataBearer };
export { $Command };
export interface GetBucketLocationCommandInput
  extends GetBucketLocationRequest {}
export interface GetBucketLocationCommandOutput
  extends GetBucketLocationOutput,
    __MetadataBearer {}
declare const GetBucketLocationCommand_base: {
  new (
    input: GetBucketLocationCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    GetBucketLocationCommandInput,
    GetBucketLocationCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: GetBucketLocationCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    GetBucketLocationCommandInput,
    GetBucketLocationCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class GetBucketLocationCommand extends GetBucketLocationCommand_base {
  protected static __types: {
    api: {
      input: GetBucketLocationRequest;
      output: GetBucketLocationOutput;
    };
    sdk: {
      input: GetBucketLocationCommandInput;
      output: GetBucketLocationCommandOutput;
    };
  };
}
