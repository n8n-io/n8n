import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListMlflowAppsRequest,
  ListMlflowAppsResponse,
} from "../models/models_3";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListMlflowAppsCommandInput extends ListMlflowAppsRequest {}
export interface ListMlflowAppsCommandOutput
  extends ListMlflowAppsResponse,
    __MetadataBearer {}
declare const ListMlflowAppsCommand_base: {
  new (
    input: ListMlflowAppsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListMlflowAppsCommandInput,
    ListMlflowAppsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListMlflowAppsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListMlflowAppsCommandInput,
    ListMlflowAppsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListMlflowAppsCommand extends ListMlflowAppsCommand_base {
  protected static __types: {
    api: {
      input: ListMlflowAppsRequest;
      output: ListMlflowAppsResponse;
    };
    sdk: {
      input: ListMlflowAppsCommandInput;
      output: ListMlflowAppsCommandOutput;
    };
  };
}
