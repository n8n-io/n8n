import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListImportJobsRequest,
  ListImportJobsResponse,
} from "../models/models_0";
import {
  ServiceInputTypes,
  ServiceOutputTypes,
  SESv2ClientResolvedConfig,
} from "../SESv2Client";
export { __MetadataBearer };
export { $Command };
export interface ListImportJobsCommandInput extends ListImportJobsRequest {}
export interface ListImportJobsCommandOutput
  extends ListImportJobsResponse,
    __MetadataBearer {}
declare const ListImportJobsCommand_base: {
  new (
    input: ListImportJobsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListImportJobsCommandInput,
    ListImportJobsCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListImportJobsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListImportJobsCommandInput,
    ListImportJobsCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListImportJobsCommand extends ListImportJobsCommand_base {
  protected static __types: {
    api: {
      input: ListImportJobsRequest;
      output: ListImportJobsResponse;
    };
    sdk: {
      input: ListImportJobsCommandInput;
      output: ListImportJobsCommandOutput;
    };
  };
}
