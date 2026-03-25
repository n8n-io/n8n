import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListProcessingJobsRequest,
  ListProcessingJobsResponse,
} from "../models/models_4";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListProcessingJobsCommandInput
  extends ListProcessingJobsRequest {}
export interface ListProcessingJobsCommandOutput
  extends ListProcessingJobsResponse,
    __MetadataBearer {}
declare const ListProcessingJobsCommand_base: {
  new (
    input: ListProcessingJobsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListProcessingJobsCommandInput,
    ListProcessingJobsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListProcessingJobsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListProcessingJobsCommandInput,
    ListProcessingJobsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListProcessingJobsCommand extends ListProcessingJobsCommand_base {
  protected static __types: {
    api: {
      input: ListProcessingJobsRequest;
      output: ListProcessingJobsResponse;
    };
    sdk: {
      input: ListProcessingJobsCommandInput;
      output: ListProcessingJobsCommandOutput;
    };
  };
}
