import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListFlowDefinitionsRequest,
  ListFlowDefinitionsResponse,
} from "../models/models_3";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListFlowDefinitionsCommandInput
  extends ListFlowDefinitionsRequest {}
export interface ListFlowDefinitionsCommandOutput
  extends ListFlowDefinitionsResponse,
    __MetadataBearer {}
declare const ListFlowDefinitionsCommand_base: {
  new (
    input: ListFlowDefinitionsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListFlowDefinitionsCommandInput,
    ListFlowDefinitionsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListFlowDefinitionsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListFlowDefinitionsCommandInput,
    ListFlowDefinitionsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListFlowDefinitionsCommand extends ListFlowDefinitionsCommand_base {
  protected static __types: {
    api: {
      input: ListFlowDefinitionsRequest;
      output: ListFlowDefinitionsResponse;
    };
    sdk: {
      input: ListFlowDefinitionsCommandInput;
      output: ListFlowDefinitionsCommandOutput;
    };
  };
}
