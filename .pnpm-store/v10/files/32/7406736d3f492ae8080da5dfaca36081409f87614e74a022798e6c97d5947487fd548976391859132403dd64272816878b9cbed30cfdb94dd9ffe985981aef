import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListMonitoringSchedulesRequest,
  ListMonitoringSchedulesResponse,
} from "../models/models_4";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListMonitoringSchedulesCommandInput
  extends ListMonitoringSchedulesRequest {}
export interface ListMonitoringSchedulesCommandOutput
  extends ListMonitoringSchedulesResponse,
    __MetadataBearer {}
declare const ListMonitoringSchedulesCommand_base: {
  new (
    input: ListMonitoringSchedulesCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListMonitoringSchedulesCommandInput,
    ListMonitoringSchedulesCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListMonitoringSchedulesCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListMonitoringSchedulesCommandInput,
    ListMonitoringSchedulesCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListMonitoringSchedulesCommand extends ListMonitoringSchedulesCommand_base {
  protected static __types: {
    api: {
      input: ListMonitoringSchedulesRequest;
      output: ListMonitoringSchedulesResponse;
    };
    sdk: {
      input: ListMonitoringSchedulesCommandInput;
      output: ListMonitoringSchedulesCommandOutput;
    };
  };
}
