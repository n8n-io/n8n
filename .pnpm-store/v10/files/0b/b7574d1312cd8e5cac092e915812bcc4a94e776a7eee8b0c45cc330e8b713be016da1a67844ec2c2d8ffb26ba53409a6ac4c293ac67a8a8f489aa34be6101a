import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListExportJobsRequest,
  ListExportJobsResponse,
} from "../models/models_0";
import {
  ServiceInputTypes,
  ServiceOutputTypes,
  SESv2ClientResolvedConfig,
} from "../SESv2Client";
export { __MetadataBearer };
export { $Command };
export interface ListExportJobsCommandInput extends ListExportJobsRequest {}
export interface ListExportJobsCommandOutput
  extends ListExportJobsResponse,
    __MetadataBearer {}
declare const ListExportJobsCommand_base: {
  new (
    input: ListExportJobsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListExportJobsCommandInput,
    ListExportJobsCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListExportJobsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListExportJobsCommandInput,
    ListExportJobsCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListExportJobsCommand extends ListExportJobsCommand_base {
  protected static __types: {
    api: {
      input: ListExportJobsRequest;
      output: ListExportJobsResponse;
    };
    sdk: {
      input: ListExportJobsCommandInput;
      output: ListExportJobsCommandOutput;
    };
  };
}
