import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  BedrockAgentRuntimeClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../BedrockAgentRuntimeClient";
import {
  CreateSessionRequest,
  CreateSessionResponse,
} from "../models/models_0";
export { __MetadataBearer };
export { $Command };
export interface CreateSessionCommandInput extends CreateSessionRequest {}
export interface CreateSessionCommandOutput
  extends CreateSessionResponse,
    __MetadataBearer {}
declare const CreateSessionCommand_base: {
  new (
    input: CreateSessionCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    CreateSessionCommandInput,
    CreateSessionCommandOutput,
    BedrockAgentRuntimeClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [CreateSessionCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    CreateSessionCommandInput,
    CreateSessionCommandOutput,
    BedrockAgentRuntimeClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class CreateSessionCommand extends CreateSessionCommand_base {
  protected static __types: {
    api: {
      input: CreateSessionRequest;
      output: CreateSessionResponse;
    };
    sdk: {
      input: CreateSessionCommandInput;
      output: CreateSessionCommandOutput;
    };
  };
}
