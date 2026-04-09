import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListHubsRequest, ListHubsResponse } from "../models/models_3";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListHubsCommandInput extends ListHubsRequest {}
export interface ListHubsCommandOutput
  extends ListHubsResponse,
    __MetadataBearer {}
declare const ListHubsCommand_base: {
  new (
    input: ListHubsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListHubsCommandInput,
    ListHubsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListHubsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListHubsCommandInput,
    ListHubsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListHubsCommand extends ListHubsCommand_base {
  protected static __types: {
    api: {
      input: ListHubsRequest;
      output: ListHubsResponse;
    };
    sdk: {
      input: ListHubsCommandInput;
      output: ListHubsCommandOutput;
    };
  };
}
