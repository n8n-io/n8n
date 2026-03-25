import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListClusterSchedulerConfigsRequest,
  ListClusterSchedulerConfigsResponse,
} from "../models/models_3";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListClusterSchedulerConfigsCommandInput
  extends ListClusterSchedulerConfigsRequest {}
export interface ListClusterSchedulerConfigsCommandOutput
  extends ListClusterSchedulerConfigsResponse,
    __MetadataBearer {}
declare const ListClusterSchedulerConfigsCommand_base: {
  new (
    input: ListClusterSchedulerConfigsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListClusterSchedulerConfigsCommandInput,
    ListClusterSchedulerConfigsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListClusterSchedulerConfigsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListClusterSchedulerConfigsCommandInput,
    ListClusterSchedulerConfigsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListClusterSchedulerConfigsCommand extends ListClusterSchedulerConfigsCommand_base {
  protected static __types: {
    api: {
      input: ListClusterSchedulerConfigsRequest;
      output: ListClusterSchedulerConfigsResponse;
    };
    sdk: {
      input: ListClusterSchedulerConfigsCommandInput;
      output: ListClusterSchedulerConfigsCommandOutput;
    };
  };
}
