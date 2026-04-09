import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListModelBiasJobDefinitionsRequest,
  ListModelBiasJobDefinitionsResponse,
} from "../models/models_3";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListModelBiasJobDefinitionsCommandInput
  extends ListModelBiasJobDefinitionsRequest {}
export interface ListModelBiasJobDefinitionsCommandOutput
  extends ListModelBiasJobDefinitionsResponse,
    __MetadataBearer {}
declare const ListModelBiasJobDefinitionsCommand_base: {
  new (
    input: ListModelBiasJobDefinitionsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListModelBiasJobDefinitionsCommandInput,
    ListModelBiasJobDefinitionsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListModelBiasJobDefinitionsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListModelBiasJobDefinitionsCommandInput,
    ListModelBiasJobDefinitionsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListModelBiasJobDefinitionsCommand extends ListModelBiasJobDefinitionsCommand_base {
  protected static __types: {
    api: {
      input: ListModelBiasJobDefinitionsRequest;
      output: ListModelBiasJobDefinitionsResponse;
    };
    sdk: {
      input: ListModelBiasJobDefinitionsCommandInput;
      output: ListModelBiasJobDefinitionsCommandOutput;
    };
  };
}
