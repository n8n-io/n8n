import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListActionsRequest, ListActionsResponse } from "../models/models_3";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListActionsCommandInput extends ListActionsRequest {}
export interface ListActionsCommandOutput
  extends ListActionsResponse,
    __MetadataBearer {}
declare const ListActionsCommand_base: {
  new (
    input: ListActionsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListActionsCommandInput,
    ListActionsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListActionsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListActionsCommandInput,
    ListActionsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListActionsCommand extends ListActionsCommand_base {
  protected static __types: {
    api: {
      input: ListActionsRequest;
      output: ListActionsResponse;
    };
    sdk: {
      input: ListActionsCommandInput;
      output: ListActionsCommandOutput;
    };
  };
}
