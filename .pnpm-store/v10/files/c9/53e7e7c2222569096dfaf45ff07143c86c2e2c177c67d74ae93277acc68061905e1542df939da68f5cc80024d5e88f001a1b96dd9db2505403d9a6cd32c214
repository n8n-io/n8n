import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListPartnerAppsRequest,
  ListPartnerAppsResponse,
} from "../models/models_4";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListPartnerAppsCommandInput extends ListPartnerAppsRequest {}
export interface ListPartnerAppsCommandOutput
  extends ListPartnerAppsResponse,
    __MetadataBearer {}
declare const ListPartnerAppsCommand_base: {
  new (
    input: ListPartnerAppsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListPartnerAppsCommandInput,
    ListPartnerAppsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListPartnerAppsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListPartnerAppsCommandInput,
    ListPartnerAppsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListPartnerAppsCommand extends ListPartnerAppsCommand_base {
  protected static __types: {
    api: {
      input: ListPartnerAppsRequest;
      output: ListPartnerAppsResponse;
    };
    sdk: {
      input: ListPartnerAppsCommandInput;
      output: ListPartnerAppsCommandOutput;
    };
  };
}
