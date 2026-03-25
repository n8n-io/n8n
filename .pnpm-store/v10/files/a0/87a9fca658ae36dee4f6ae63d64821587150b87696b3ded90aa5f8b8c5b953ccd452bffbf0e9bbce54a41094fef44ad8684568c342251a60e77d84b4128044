import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListBucketsOutput, ListBucketsRequest } from "../models/models_0";
import {
  S3ClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../S3Client";
export { __MetadataBearer };
export { $Command };
export interface ListBucketsCommandInput extends ListBucketsRequest {}
export interface ListBucketsCommandOutput
  extends ListBucketsOutput,
    __MetadataBearer {}
declare const ListBucketsCommand_base: {
  new (
    input: ListBucketsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListBucketsCommandInput,
    ListBucketsCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListBucketsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListBucketsCommandInput,
    ListBucketsCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListBucketsCommand extends ListBucketsCommand_base {
  protected static __types: {
    api: {
      input: ListBucketsRequest;
      output: ListBucketsOutput;
    };
    sdk: {
      input: ListBucketsCommandInput;
      output: ListBucketsCommandOutput;
    };
  };
}
