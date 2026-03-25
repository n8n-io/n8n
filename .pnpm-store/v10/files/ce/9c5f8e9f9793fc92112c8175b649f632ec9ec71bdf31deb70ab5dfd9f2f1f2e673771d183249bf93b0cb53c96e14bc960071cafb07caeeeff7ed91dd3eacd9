import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  BedrockAgentRuntimeClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../BedrockAgentRuntimeClient";
import { RerankRequest, RerankResponse } from "../models/models_0";
export { __MetadataBearer };
export { $Command };
export interface RerankCommandInput extends RerankRequest {}
export interface RerankCommandOutput extends RerankResponse, __MetadataBearer {}
declare const RerankCommand_base: {
  new (input: RerankCommandInput): import("@smithy/smithy-client").CommandImpl<
    RerankCommandInput,
    RerankCommandOutput,
    BedrockAgentRuntimeClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (input: RerankCommandInput): import("@smithy/smithy-client").CommandImpl<
    RerankCommandInput,
    RerankCommandOutput,
    BedrockAgentRuntimeClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class RerankCommand extends RerankCommand_base {
  protected static __types: {
    api: {
      input: RerankRequest;
      output: RerankResponse;
    };
    sdk: {
      input: RerankCommandInput;
      output: RerankCommandOutput;
    };
  };
}
