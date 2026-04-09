import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  BedrockAgentRuntimeClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../BedrockAgentRuntimeClient";
import { ListSessionsRequest, ListSessionsResponse } from "../models/models_0";
export { __MetadataBearer };
export { $Command };
export interface ListSessionsCommandInput extends ListSessionsRequest {}
export interface ListSessionsCommandOutput
  extends ListSessionsResponse,
    __MetadataBearer {}
declare const ListSessionsCommand_base: {
  new (
    input: ListSessionsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListSessionsCommandInput,
    ListSessionsCommandOutput,
    BedrockAgentRuntimeClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListSessionsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListSessionsCommandInput,
    ListSessionsCommandOutput,
    BedrockAgentRuntimeClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListSessionsCommand extends ListSessionsCommand_base {
  protected static __types: {
    api: {
      input: ListSessionsRequest;
      output: ListSessionsResponse;
    };
    sdk: {
      input: ListSessionsCommandInput;
      output: ListSessionsCommandOutput;
    };
  };
}
