import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CopyObjectOutput, CopyObjectRequest } from "../models/models_0";
import {
  S3ClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../S3Client";
export { __MetadataBearer };
export { $Command };
export interface CopyObjectCommandInput extends CopyObjectRequest {}
export interface CopyObjectCommandOutput
  extends CopyObjectOutput,
    __MetadataBearer {}
declare const CopyObjectCommand_base: {
  new (
    input: CopyObjectCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    CopyObjectCommandInput,
    CopyObjectCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: CopyObjectCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    CopyObjectCommandInput,
    CopyObjectCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class CopyObjectCommand extends CopyObjectCommand_base {
  protected static __types: {
    api: {
      input: CopyObjectRequest;
      output: CopyObjectOutput;
    };
    sdk: {
      input: CopyObjectCommandInput;
      output: CopyObjectCommandOutput;
    };
  };
}
