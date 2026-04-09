import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListInferenceExperimentsRequest,
  ListInferenceExperimentsResponse,
} from "../models/models_3";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListInferenceExperimentsCommandInput
  extends ListInferenceExperimentsRequest {}
export interface ListInferenceExperimentsCommandOutput
  extends ListInferenceExperimentsResponse,
    __MetadataBearer {}
declare const ListInferenceExperimentsCommand_base: {
  new (
    input: ListInferenceExperimentsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListInferenceExperimentsCommandInput,
    ListInferenceExperimentsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListInferenceExperimentsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListInferenceExperimentsCommandInput,
    ListInferenceExperimentsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListInferenceExperimentsCommand extends ListInferenceExperimentsCommand_base {
  protected static __types: {
    api: {
      input: ListInferenceExperimentsRequest;
      output: ListInferenceExperimentsResponse;
    };
    sdk: {
      input: ListInferenceExperimentsCommandInput;
      output: ListInferenceExperimentsCommandOutput;
    };
  };
}
