import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListCompilationJobsRequest,
  ListCompilationJobsResponse,
} from "../models/models_3";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListCompilationJobsCommandInput
  extends ListCompilationJobsRequest {}
export interface ListCompilationJobsCommandOutput
  extends ListCompilationJobsResponse,
    __MetadataBearer {}
declare const ListCompilationJobsCommand_base: {
  new (
    input: ListCompilationJobsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListCompilationJobsCommandInput,
    ListCompilationJobsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListCompilationJobsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListCompilationJobsCommandInput,
    ListCompilationJobsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListCompilationJobsCommand extends ListCompilationJobsCommand_base {
  protected static __types: {
    api: {
      input: ListCompilationJobsRequest;
      output: ListCompilationJobsResponse;
    };
    sdk: {
      input: ListCompilationJobsCommandInput;
      output: ListCompilationJobsCommandOutput;
    };
  };
}
