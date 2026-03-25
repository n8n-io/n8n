import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListTrialComponentsRequest,
  ListTrialComponentsResponse,
} from "../models/models_4";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListTrialComponentsCommandInput
  extends ListTrialComponentsRequest {}
export interface ListTrialComponentsCommandOutput
  extends ListTrialComponentsResponse,
    __MetadataBearer {}
declare const ListTrialComponentsCommand_base: {
  new (
    input: ListTrialComponentsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListTrialComponentsCommandInput,
    ListTrialComponentsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListTrialComponentsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListTrialComponentsCommandInput,
    ListTrialComponentsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListTrialComponentsCommand extends ListTrialComponentsCommand_base {
  protected static __types: {
    api: {
      input: ListTrialComponentsRequest;
      output: ListTrialComponentsResponse;
    };
    sdk: {
      input: ListTrialComponentsCommandInput;
      output: ListTrialComponentsCommandOutput;
    };
  };
}
