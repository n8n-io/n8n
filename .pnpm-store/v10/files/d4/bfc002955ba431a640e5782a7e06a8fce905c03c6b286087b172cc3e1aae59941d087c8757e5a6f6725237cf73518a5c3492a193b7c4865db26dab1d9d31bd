import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListLabelingJobsRequest,
  ListLabelingJobsResponse,
} from "../models/models_3";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListLabelingJobsCommandInput extends ListLabelingJobsRequest {}
export interface ListLabelingJobsCommandOutput
  extends ListLabelingJobsResponse,
    __MetadataBearer {}
declare const ListLabelingJobsCommand_base: {
  new (
    input: ListLabelingJobsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListLabelingJobsCommandInput,
    ListLabelingJobsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListLabelingJobsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListLabelingJobsCommandInput,
    ListLabelingJobsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListLabelingJobsCommand extends ListLabelingJobsCommand_base {
  protected static __types: {
    api: {
      input: ListLabelingJobsRequest;
      output: ListLabelingJobsResponse;
    };
    sdk: {
      input: ListLabelingJobsCommandInput;
      output: ListLabelingJobsCommandOutput;
    };
  };
}
