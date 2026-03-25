import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListDataQualityJobDefinitionsRequest,
  ListDataQualityJobDefinitionsResponse,
} from "../models/models_4";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListDataQualityJobDefinitionsCommandInput
  extends ListDataQualityJobDefinitionsRequest {}
export interface ListDataQualityJobDefinitionsCommandOutput
  extends ListDataQualityJobDefinitionsResponse,
    __MetadataBearer {}
declare const ListDataQualityJobDefinitionsCommand_base: {
  new (
    input: ListDataQualityJobDefinitionsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListDataQualityJobDefinitionsCommandInput,
    ListDataQualityJobDefinitionsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListDataQualityJobDefinitionsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListDataQualityJobDefinitionsCommandInput,
    ListDataQualityJobDefinitionsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListDataQualityJobDefinitionsCommand extends ListDataQualityJobDefinitionsCommand_base {
  protected static __types: {
    api: {
      input: ListDataQualityJobDefinitionsRequest;
      output: ListDataQualityJobDefinitionsResponse;
    };
    sdk: {
      input: ListDataQualityJobDefinitionsCommandInput;
      output: ListDataQualityJobDefinitionsCommandOutput;
    };
  };
}
