import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListModelQualityJobDefinitionsRequest,
  ListModelQualityJobDefinitionsResponse,
} from "../models/models_3";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListModelQualityJobDefinitionsCommandInput
  extends ListModelQualityJobDefinitionsRequest {}
export interface ListModelQualityJobDefinitionsCommandOutput
  extends ListModelQualityJobDefinitionsResponse,
    __MetadataBearer {}
declare const ListModelQualityJobDefinitionsCommand_base: {
  new (
    input: ListModelQualityJobDefinitionsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListModelQualityJobDefinitionsCommandInput,
    ListModelQualityJobDefinitionsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListModelQualityJobDefinitionsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListModelQualityJobDefinitionsCommandInput,
    ListModelQualityJobDefinitionsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListModelQualityJobDefinitionsCommand extends ListModelQualityJobDefinitionsCommand_base {
  protected static __types: {
    api: {
      input: ListModelQualityJobDefinitionsRequest;
      output: ListModelQualityJobDefinitionsResponse;
    };
    sdk: {
      input: ListModelQualityJobDefinitionsCommandInput;
      output: ListModelQualityJobDefinitionsCommandOutput;
    };
  };
}
