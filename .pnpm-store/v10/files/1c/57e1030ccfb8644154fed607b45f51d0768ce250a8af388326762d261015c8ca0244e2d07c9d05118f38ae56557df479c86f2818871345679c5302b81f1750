import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListMonitoringExecutionsRequest,
  ListMonitoringExecutionsResponse,
} from "../models/models_3";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListMonitoringExecutionsCommandInput
  extends ListMonitoringExecutionsRequest {}
export interface ListMonitoringExecutionsCommandOutput
  extends ListMonitoringExecutionsResponse,
    __MetadataBearer {}
declare const ListMonitoringExecutionsCommand_base: {
  new (
    input: ListMonitoringExecutionsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListMonitoringExecutionsCommandInput,
    ListMonitoringExecutionsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListMonitoringExecutionsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListMonitoringExecutionsCommandInput,
    ListMonitoringExecutionsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListMonitoringExecutionsCommand extends ListMonitoringExecutionsCommand_base {
  protected static __types: {
    api: {
      input: ListMonitoringExecutionsRequest;
      output: ListMonitoringExecutionsResponse;
    };
    sdk: {
      input: ListMonitoringExecutionsCommandInput;
      output: ListMonitoringExecutionsCommandOutput;
    };
  };
}
