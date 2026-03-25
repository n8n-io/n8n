import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListTrainingPlansRequest,
  ListTrainingPlansResponse,
} from "../models/models_4";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListTrainingPlansCommandInput
  extends ListTrainingPlansRequest {}
export interface ListTrainingPlansCommandOutput
  extends ListTrainingPlansResponse,
    __MetadataBearer {}
declare const ListTrainingPlansCommand_base: {
  new (
    input: ListTrainingPlansCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListTrainingPlansCommandInput,
    ListTrainingPlansCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListTrainingPlansCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListTrainingPlansCommandInput,
    ListTrainingPlansCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListTrainingPlansCommand extends ListTrainingPlansCommand_base {
  protected static __types: {
    api: {
      input: ListTrainingPlansRequest;
      output: ListTrainingPlansResponse;
    };
    sdk: {
      input: ListTrainingPlansCommandInput;
      output: ListTrainingPlansCommandOutput;
    };
  };
}
