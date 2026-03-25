import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetBucketAclOutput, GetBucketAclRequest } from "../models/models_0";
import {
  S3ClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../S3Client";
export { __MetadataBearer };
export { $Command };
export interface GetBucketAclCommandInput extends GetBucketAclRequest {}
export interface GetBucketAclCommandOutput
  extends GetBucketAclOutput,
    __MetadataBearer {}
declare const GetBucketAclCommand_base: {
  new (
    input: GetBucketAclCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    GetBucketAclCommandInput,
    GetBucketAclCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: GetBucketAclCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    GetBucketAclCommandInput,
    GetBucketAclCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class GetBucketAclCommand extends GetBucketAclCommand_base {
  protected static __types: {
    api: {
      input: GetBucketAclRequest;
      output: GetBucketAclOutput;
    };
    sdk: {
      input: GetBucketAclCommandInput;
      output: GetBucketAclCommandOutput;
    };
  };
}
