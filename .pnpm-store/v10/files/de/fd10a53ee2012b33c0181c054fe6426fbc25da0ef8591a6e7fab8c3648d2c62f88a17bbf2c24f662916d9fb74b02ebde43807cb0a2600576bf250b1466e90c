import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutObjectAclOutput, PutObjectAclRequest } from "../models/models_1";
import {
  S3ClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../S3Client";
export { __MetadataBearer };
export { $Command };
export interface PutObjectAclCommandInput extends PutObjectAclRequest {}
export interface PutObjectAclCommandOutput
  extends PutObjectAclOutput,
    __MetadataBearer {}
declare const PutObjectAclCommand_base: {
  new (
    input: PutObjectAclCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    PutObjectAclCommandInput,
    PutObjectAclCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: PutObjectAclCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    PutObjectAclCommandInput,
    PutObjectAclCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class PutObjectAclCommand extends PutObjectAclCommand_base {
  protected static __types: {
    api: {
      input: PutObjectAclRequest;
      output: PutObjectAclOutput;
    };
    sdk: {
      input: PutObjectAclCommandInput;
      output: PutObjectAclCommandOutput;
    };
  };
}
