import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListModelMetadataRequest,
  ListModelMetadataResponse,
} from "../models/models_4";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListModelMetadataCommandInput
  extends ListModelMetadataRequest {}
export interface ListModelMetadataCommandOutput
  extends ListModelMetadataResponse,
    __MetadataBearer {}
declare const ListModelMetadataCommand_base: {
  new (
    input: ListModelMetadataCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListModelMetadataCommandInput,
    ListModelMetadataCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListModelMetadataCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListModelMetadataCommandInput,
    ListModelMetadataCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListModelMetadataCommand extends ListModelMetadataCommand_base {
  protected static __types: {
    api: {
      input: ListModelMetadataRequest;
      output: ListModelMetadataResponse;
    };
    sdk: {
      input: ListModelMetadataCommandInput;
      output: ListModelMetadataCommandOutput;
    };
  };
}
