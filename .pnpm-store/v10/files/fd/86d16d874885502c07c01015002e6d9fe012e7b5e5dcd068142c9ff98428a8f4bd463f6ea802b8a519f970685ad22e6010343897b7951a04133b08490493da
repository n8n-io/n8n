import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  BedrockRuntimeClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../BedrockRuntimeClient";
import { CountTokensRequest, CountTokensResponse } from "../models/models_0";
export { __MetadataBearer };
export { $Command };
export interface CountTokensCommandInput extends CountTokensRequest {}
export interface CountTokensCommandOutput
  extends CountTokensResponse,
    __MetadataBearer {}
declare const CountTokensCommand_base: {
  new (
    input: CountTokensCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    CountTokensCommandInput,
    CountTokensCommandOutput,
    BedrockRuntimeClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: CountTokensCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    CountTokensCommandInput,
    CountTokensCommandOutput,
    BedrockRuntimeClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class CountTokensCommand extends CountTokensCommand_base {
  protected static __types: {
    api: {
      input: CountTokensRequest;
      output: CountTokensResponse;
    };
    sdk: {
      input: CountTokensCommandInput;
      output: CountTokensCommandOutput;
    };
  };
}
