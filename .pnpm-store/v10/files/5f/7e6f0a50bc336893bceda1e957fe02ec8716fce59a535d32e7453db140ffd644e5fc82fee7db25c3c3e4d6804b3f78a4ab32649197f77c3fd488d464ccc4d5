import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  GetObjectAttributesOutput,
  GetObjectAttributesRequest,
} from "../models/models_0";
import {
  S3ClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../S3Client";
export { __MetadataBearer };
export { $Command };
export interface GetObjectAttributesCommandInput
  extends GetObjectAttributesRequest {}
export interface GetObjectAttributesCommandOutput
  extends GetObjectAttributesOutput,
    __MetadataBearer {}
declare const GetObjectAttributesCommand_base: {
  new (
    input: GetObjectAttributesCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    GetObjectAttributesCommandInput,
    GetObjectAttributesCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: GetObjectAttributesCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    GetObjectAttributesCommandInput,
    GetObjectAttributesCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class GetObjectAttributesCommand extends GetObjectAttributesCommand_base {
  protected static __types: {
    api: {
      input: GetObjectAttributesRequest;
      output: GetObjectAttributesOutput;
    };
    sdk: {
      input: GetObjectAttributesCommandInput;
      output: GetObjectAttributesCommandOutput;
    };
  };
}
