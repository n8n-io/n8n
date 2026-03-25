import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListPipelinesRequest,
  ListPipelinesResponse,
} from "../models/models_4";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListPipelinesCommandInput extends ListPipelinesRequest {}
export interface ListPipelinesCommandOutput
  extends ListPipelinesResponse,
    __MetadataBearer {}
declare const ListPipelinesCommand_base: {
  new (
    input: ListPipelinesCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListPipelinesCommandInput,
    ListPipelinesCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListPipelinesCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListPipelinesCommandInput,
    ListPipelinesCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListPipelinesCommand extends ListPipelinesCommand_base {
  protected static __types: {
    api: {
      input: ListPipelinesRequest;
      output: ListPipelinesResponse;
    };
    sdk: {
      input: ListPipelinesCommandInput;
      output: ListPipelinesCommandOutput;
    };
  };
}
