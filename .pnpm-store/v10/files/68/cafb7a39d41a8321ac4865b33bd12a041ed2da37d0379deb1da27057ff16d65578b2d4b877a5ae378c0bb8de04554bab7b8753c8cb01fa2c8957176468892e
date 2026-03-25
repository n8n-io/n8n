import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListMultipartUploadsOutput,
  ListMultipartUploadsRequest,
} from "../models/models_0";
import {
  S3ClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../S3Client";
export { __MetadataBearer };
export { $Command };
export interface ListMultipartUploadsCommandInput
  extends ListMultipartUploadsRequest {}
export interface ListMultipartUploadsCommandOutput
  extends ListMultipartUploadsOutput,
    __MetadataBearer {}
declare const ListMultipartUploadsCommand_base: {
  new (
    input: ListMultipartUploadsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListMultipartUploadsCommandInput,
    ListMultipartUploadsCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: ListMultipartUploadsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListMultipartUploadsCommandInput,
    ListMultipartUploadsCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListMultipartUploadsCommand extends ListMultipartUploadsCommand_base {
  protected static __types: {
    api: {
      input: ListMultipartUploadsRequest;
      output: ListMultipartUploadsOutput;
    };
    sdk: {
      input: ListMultipartUploadsCommandInput;
      output: ListMultipartUploadsCommandOutput;
    };
  };
}
