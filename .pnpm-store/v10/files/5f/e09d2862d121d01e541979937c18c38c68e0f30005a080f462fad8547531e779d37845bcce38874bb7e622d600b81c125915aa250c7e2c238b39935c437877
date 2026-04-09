import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListExperimentsRequest,
  ListExperimentsResponse,
} from "../models/models_3";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListExperimentsCommandInput extends ListExperimentsRequest {}
export interface ListExperimentsCommandOutput
  extends ListExperimentsResponse,
    __MetadataBearer {}
declare const ListExperimentsCommand_base: {
  new (
    input: ListExperimentsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListExperimentsCommandInput,
    ListExperimentsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListExperimentsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListExperimentsCommandInput,
    ListExperimentsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListExperimentsCommand extends ListExperimentsCommand_base {
  protected static __types: {
    api: {
      input: ListExperimentsRequest;
      output: ListExperimentsResponse;
    };
    sdk: {
      input: ListExperimentsCommandInput;
      output: ListExperimentsCommandOutput;
    };
  };
}
