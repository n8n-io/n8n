import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListAppsRequest, ListAppsResponse } from "../models/models_3";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListAppsCommandInput extends ListAppsRequest {}
export interface ListAppsCommandOutput
  extends ListAppsResponse,
    __MetadataBearer {}
declare const ListAppsCommand_base: {
  new (
    input: ListAppsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListAppsCommandInput,
    ListAppsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListAppsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListAppsCommandInput,
    ListAppsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListAppsCommand extends ListAppsCommand_base {
  protected static __types: {
    api: {
      input: ListAppsRequest;
      output: ListAppsResponse;
    };
    sdk: {
      input: ListAppsCommandInput;
      output: ListAppsCommandOutput;
    };
  };
}
