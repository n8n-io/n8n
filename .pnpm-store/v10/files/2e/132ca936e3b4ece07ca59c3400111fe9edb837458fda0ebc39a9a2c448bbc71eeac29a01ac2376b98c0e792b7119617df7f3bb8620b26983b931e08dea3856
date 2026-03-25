import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateBucketOutput, CreateBucketRequest } from "../models/models_0";
import {
  S3ClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../S3Client";
export { __MetadataBearer };
export { $Command };
export interface CreateBucketCommandInput extends CreateBucketRequest {}
export interface CreateBucketCommandOutput
  extends CreateBucketOutput,
    __MetadataBearer {}
declare const CreateBucketCommand_base: {
  new (
    input: CreateBucketCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    CreateBucketCommandInput,
    CreateBucketCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: CreateBucketCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    CreateBucketCommandInput,
    CreateBucketCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class CreateBucketCommand extends CreateBucketCommand_base {
  protected static __types: {
    api: {
      input: CreateBucketRequest;
      output: CreateBucketOutput;
    };
    sdk: {
      input: CreateBucketCommandInput;
      output: CreateBucketCommandOutput;
    };
  };
}
