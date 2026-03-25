import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetObjectAclOutput, GetObjectAclRequest } from "../models/models_0";
import {
  S3ClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../S3Client";
export { __MetadataBearer };
export { $Command };
export interface GetObjectAclCommandInput extends GetObjectAclRequest {}
export interface GetObjectAclCommandOutput
  extends GetObjectAclOutput,
    __MetadataBearer {}
declare const GetObjectAclCommand_base: {
  new (
    input: GetObjectAclCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    GetObjectAclCommandInput,
    GetObjectAclCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: GetObjectAclCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    GetObjectAclCommandInput,
    GetObjectAclCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class GetObjectAclCommand extends GetObjectAclCommand_base {
  protected static __types: {
    api: {
      input: GetObjectAclRequest;
      output: GetObjectAclOutput;
    };
    sdk: {
      input: GetObjectAclCommandInput;
      output: GetObjectAclCommandOutput;
    };
  };
}
