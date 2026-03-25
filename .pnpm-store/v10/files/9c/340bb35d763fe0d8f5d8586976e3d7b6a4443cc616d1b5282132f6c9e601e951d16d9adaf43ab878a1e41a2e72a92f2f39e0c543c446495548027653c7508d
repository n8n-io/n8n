import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListObjectVersionsOutput,
  ListObjectVersionsRequest,
} from "../models/models_0";
import {
  S3ClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../S3Client";
export { __MetadataBearer };
export { $Command };
export interface ListObjectVersionsCommandInput
  extends ListObjectVersionsRequest {}
export interface ListObjectVersionsCommandOutput
  extends ListObjectVersionsOutput,
    __MetadataBearer {}
declare const ListObjectVersionsCommand_base: {
  new (
    input: ListObjectVersionsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListObjectVersionsCommandInput,
    ListObjectVersionsCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: ListObjectVersionsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListObjectVersionsCommandInput,
    ListObjectVersionsCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListObjectVersionsCommand extends ListObjectVersionsCommand_base {
  protected static __types: {
    api: {
      input: ListObjectVersionsRequest;
      output: ListObjectVersionsOutput;
    };
    sdk: {
      input: ListObjectVersionsCommandInput;
      output: ListObjectVersionsCommandOutput;
    };
  };
}
