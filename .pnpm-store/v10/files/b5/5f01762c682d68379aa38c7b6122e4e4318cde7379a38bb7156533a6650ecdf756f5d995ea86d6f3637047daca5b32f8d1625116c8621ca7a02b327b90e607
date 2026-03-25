import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListDevicesRequest, ListDevicesResponse } from "../models/models_4";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListDevicesCommandInput extends ListDevicesRequest {}
export interface ListDevicesCommandOutput
  extends ListDevicesResponse,
    __MetadataBearer {}
declare const ListDevicesCommand_base: {
  new (
    input: ListDevicesCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListDevicesCommandInput,
    ListDevicesCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListDevicesCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListDevicesCommandInput,
    ListDevicesCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListDevicesCommand extends ListDevicesCommand_base {
  protected static __types: {
    api: {
      input: ListDevicesRequest;
      output: ListDevicesResponse;
    };
    sdk: {
      input: ListDevicesCommandInput;
      output: ListDevicesCommandOutput;
    };
  };
}
