import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateTokenRequest, CreateTokenResponse } from "../models/models_0";
import { SSOOIDCClientResolvedConfig } from "../SSOOIDCClient";
export { __MetadataBearer };
export { $Command };
export interface CreateTokenCommandInput extends CreateTokenRequest {}
export interface CreateTokenCommandOutput
  extends CreateTokenResponse,
    __MetadataBearer {}
declare const CreateTokenCommand_base: {
  new (
    input: CreateTokenCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    CreateTokenCommandInput,
    CreateTokenCommandOutput,
    SSOOIDCClientResolvedConfig,
    CreateTokenCommandInput,
    CreateTokenCommandOutput
  >;
  new (
    input: CreateTokenCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    CreateTokenCommandInput,
    CreateTokenCommandOutput,
    SSOOIDCClientResolvedConfig,
    CreateTokenCommandInput,
    CreateTokenCommandOutput
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class CreateTokenCommand extends CreateTokenCommand_base {
  protected static __types: {
    api: {
      input: CreateTokenRequest;
      output: CreateTokenResponse;
    };
    sdk: {
      input: CreateTokenCommandInput;
      output: CreateTokenCommandOutput;
    };
  };
}
