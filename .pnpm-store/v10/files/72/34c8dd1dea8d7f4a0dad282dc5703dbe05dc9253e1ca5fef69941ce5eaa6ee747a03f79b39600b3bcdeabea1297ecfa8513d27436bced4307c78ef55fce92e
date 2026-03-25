import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListTrainingJobsRequest,
  ListTrainingJobsResponse,
} from "../models/models_4";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListTrainingJobsCommandInput extends ListTrainingJobsRequest {}
export interface ListTrainingJobsCommandOutput
  extends ListTrainingJobsResponse,
    __MetadataBearer {}
declare const ListTrainingJobsCommand_base: {
  new (
    input: ListTrainingJobsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListTrainingJobsCommandInput,
    ListTrainingJobsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListTrainingJobsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListTrainingJobsCommandInput,
    ListTrainingJobsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListTrainingJobsCommand extends ListTrainingJobsCommand_base {
  protected static __types: {
    api: {
      input: ListTrainingJobsRequest;
      output: ListTrainingJobsResponse;
    };
    sdk: {
      input: ListTrainingJobsCommandInput;
      output: ListTrainingJobsCommandOutput;
    };
  };
}
