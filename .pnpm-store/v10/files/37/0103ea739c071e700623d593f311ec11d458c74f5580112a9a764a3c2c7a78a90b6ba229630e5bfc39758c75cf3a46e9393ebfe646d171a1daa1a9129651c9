import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListOptimizationJobsRequest,
  ListOptimizationJobsResponse,
} from "../models/models_3";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListOptimizationJobsCommandInput
  extends ListOptimizationJobsRequest {}
export interface ListOptimizationJobsCommandOutput
  extends ListOptimizationJobsResponse,
    __MetadataBearer {}
declare const ListOptimizationJobsCommand_base: {
  new (
    input: ListOptimizationJobsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListOptimizationJobsCommandInput,
    ListOptimizationJobsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListOptimizationJobsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListOptimizationJobsCommandInput,
    ListOptimizationJobsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListOptimizationJobsCommand extends ListOptimizationJobsCommand_base {
  protected static __types: {
    api: {
      input: ListOptimizationJobsRequest;
      output: ListOptimizationJobsResponse;
    };
    sdk: {
      input: ListOptimizationJobsCommandInput;
      output: ListOptimizationJobsCommandOutput;
    };
  };
}
