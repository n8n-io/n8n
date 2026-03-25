import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { RestoreObjectOutput, RestoreObjectRequest } from "../models/models_1";
import {
  S3ClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../S3Client";
export { __MetadataBearer };
export { $Command };
export interface RestoreObjectCommandInput extends RestoreObjectRequest {}
export interface RestoreObjectCommandOutput
  extends RestoreObjectOutput,
    __MetadataBearer {}
declare const RestoreObjectCommand_base: {
  new (
    input: RestoreObjectCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    RestoreObjectCommandInput,
    RestoreObjectCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: RestoreObjectCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    RestoreObjectCommandInput,
    RestoreObjectCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class RestoreObjectCommand extends RestoreObjectCommand_base {
  protected static __types: {
    api: {
      input: RestoreObjectRequest;
      output: RestoreObjectOutput;
    };
    sdk: {
      input: RestoreObjectCommandInput;
      output: RestoreObjectCommandOutput;
    };
  };
}
