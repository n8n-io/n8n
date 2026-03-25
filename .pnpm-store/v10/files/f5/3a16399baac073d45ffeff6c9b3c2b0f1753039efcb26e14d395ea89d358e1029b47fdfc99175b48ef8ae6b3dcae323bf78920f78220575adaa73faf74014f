import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListModelsInput, ListModelsOutput } from "../models/models_4";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListModelsCommandInput extends ListModelsInput {}
export interface ListModelsCommandOutput
  extends ListModelsOutput,
    __MetadataBearer {}
declare const ListModelsCommand_base: {
  new (
    input: ListModelsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListModelsCommandInput,
    ListModelsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListModelsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListModelsCommandInput,
    ListModelsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListModelsCommand extends ListModelsCommand_base {
  protected static __types: {
    api: {
      input: ListModelsInput;
      output: ListModelsOutput;
    };
    sdk: {
      input: ListModelsCommandInput;
      output: ListModelsCommandOutput;
    };
  };
}
