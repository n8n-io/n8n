import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListContextsRequest, ListContextsResponse } from "../models/models_3";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListContextsCommandInput extends ListContextsRequest {}
export interface ListContextsCommandOutput
  extends ListContextsResponse,
    __MetadataBearer {}
declare const ListContextsCommand_base: {
  new (
    input: ListContextsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListContextsCommandInput,
    ListContextsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListContextsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListContextsCommandInput,
    ListContextsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListContextsCommand extends ListContextsCommand_base {
  protected static __types: {
    api: {
      input: ListContextsRequest;
      output: ListContextsResponse;
    };
    sdk: {
      input: ListContextsCommandInput;
      output: ListContextsCommandOutput;
    };
  };
}
