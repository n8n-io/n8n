import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListDirectoryBucketsOutput,
  ListDirectoryBucketsRequest,
} from "../models/models_0";
import {
  S3ClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../S3Client";
export { __MetadataBearer };
export { $Command };
export interface ListDirectoryBucketsCommandInput
  extends ListDirectoryBucketsRequest {}
export interface ListDirectoryBucketsCommandOutput
  extends ListDirectoryBucketsOutput,
    __MetadataBearer {}
declare const ListDirectoryBucketsCommand_base: {
  new (
    input: ListDirectoryBucketsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListDirectoryBucketsCommandInput,
    ListDirectoryBucketsCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListDirectoryBucketsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListDirectoryBucketsCommandInput,
    ListDirectoryBucketsCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListDirectoryBucketsCommand extends ListDirectoryBucketsCommand_base {
  protected static __types: {
    api: {
      input: ListDirectoryBucketsRequest;
      output: ListDirectoryBucketsOutput;
    };
    sdk: {
      input: ListDirectoryBucketsCommandInput;
      output: ListDirectoryBucketsCommandOutput;
    };
  };
}
