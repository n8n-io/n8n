import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListAlgorithmsInput, ListAlgorithmsOutput } from "../models/models_3";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListAlgorithmsCommandInput extends ListAlgorithmsInput {}
export interface ListAlgorithmsCommandOutput
  extends ListAlgorithmsOutput,
    __MetadataBearer {}
declare const ListAlgorithmsCommand_base: {
  new (
    input: ListAlgorithmsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListAlgorithmsCommandInput,
    ListAlgorithmsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListAlgorithmsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListAlgorithmsCommandInput,
    ListAlgorithmsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListAlgorithmsCommand extends ListAlgorithmsCommand_base {
  protected static __types: {
    api: {
      input: ListAlgorithmsInput;
      output: ListAlgorithmsOutput;
    };
    sdk: {
      input: ListAlgorithmsCommandInput;
      output: ListAlgorithmsCommandOutput;
    };
  };
}
