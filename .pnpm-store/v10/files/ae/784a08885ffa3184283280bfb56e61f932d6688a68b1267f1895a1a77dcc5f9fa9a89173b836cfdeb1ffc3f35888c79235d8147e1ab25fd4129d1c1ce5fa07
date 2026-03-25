import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListAutoMLJobsRequest,
  ListAutoMLJobsResponse,
} from "../models/models_3";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListAutoMLJobsCommandInput extends ListAutoMLJobsRequest {}
export interface ListAutoMLJobsCommandOutput
  extends ListAutoMLJobsResponse,
    __MetadataBearer {}
declare const ListAutoMLJobsCommand_base: {
  new (
    input: ListAutoMLJobsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListAutoMLJobsCommandInput,
    ListAutoMLJobsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListAutoMLJobsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListAutoMLJobsCommandInput,
    ListAutoMLJobsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListAutoMLJobsCommand extends ListAutoMLJobsCommand_base {
  protected static __types: {
    api: {
      input: ListAutoMLJobsRequest;
      output: ListAutoMLJobsResponse;
    };
    sdk: {
      input: ListAutoMLJobsCommandInput;
      output: ListAutoMLJobsCommandOutput;
    };
  };
}
