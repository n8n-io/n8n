import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  SelectObjectContentOutput,
  SelectObjectContentRequest,
} from "../models/models_1";
import {
  S3ClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../S3Client";
export { __MetadataBearer };
export { $Command };
export interface SelectObjectContentCommandInput
  extends SelectObjectContentRequest {}
export interface SelectObjectContentCommandOutput
  extends SelectObjectContentOutput,
    __MetadataBearer {}
declare const SelectObjectContentCommand_base: {
  new (
    input: SelectObjectContentCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    SelectObjectContentCommandInput,
    SelectObjectContentCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: SelectObjectContentCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    SelectObjectContentCommandInput,
    SelectObjectContentCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class SelectObjectContentCommand extends SelectObjectContentCommand_base {
  protected static __types: {
    api: {
      input: SelectObjectContentRequest;
      output: SelectObjectContentOutput;
    };
    sdk: {
      input: SelectObjectContentCommandInput;
      output: SelectObjectContentCommandOutput;
    };
  };
}
