import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  RegisterClientRequest,
  RegisterClientResponse,
} from "../models/models_0";
import {
  ServiceInputTypes,
  ServiceOutputTypes,
  SSOOIDCClientResolvedConfig,
} from "../SSOOIDCClient";
export { __MetadataBearer };
export { $Command };
export interface RegisterClientCommandInput extends RegisterClientRequest {}
export interface RegisterClientCommandOutput
  extends RegisterClientResponse,
    __MetadataBearer {}
declare const RegisterClientCommand_base: {
  new (
    input: RegisterClientCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    RegisterClientCommandInput,
    RegisterClientCommandOutput,
    SSOOIDCClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: RegisterClientCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    RegisterClientCommandInput,
    RegisterClientCommandOutput,
    SSOOIDCClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class RegisterClientCommand extends RegisterClientCommand_base {
  protected static __types: {
    api: {
      input: RegisterClientRequest;
      output: RegisterClientResponse;
    };
    sdk: {
      input: RegisterClientCommandInput;
      output: RegisterClientCommandOutput;
    };
  };
}
