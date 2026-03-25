import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListAppImageConfigsRequest,
  ListAppImageConfigsResponse,
} from "../models/models_3";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListAppImageConfigsCommandInput
  extends ListAppImageConfigsRequest {}
export interface ListAppImageConfigsCommandOutput
  extends ListAppImageConfigsResponse,
    __MetadataBearer {}
declare const ListAppImageConfigsCommand_base: {
  new (
    input: ListAppImageConfigsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListAppImageConfigsCommandInput,
    ListAppImageConfigsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListAppImageConfigsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListAppImageConfigsCommandInput,
    ListAppImageConfigsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListAppImageConfigsCommand extends ListAppImageConfigsCommand_base {
  protected static __types: {
    api: {
      input: ListAppImageConfigsRequest;
      output: ListAppImageConfigsResponse;
    };
    sdk: {
      input: ListAppImageConfigsCommandInput;
      output: ListAppImageConfigsCommandOutput;
    };
  };
}
