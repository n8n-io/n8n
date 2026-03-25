import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  RestoreSecretRequest,
  RestoreSecretResponse,
} from "../models/models_0";
import {
  SecretsManagerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SecretsManagerClient";
export { __MetadataBearer };
export { $Command };
export interface RestoreSecretCommandInput extends RestoreSecretRequest {}
export interface RestoreSecretCommandOutput
  extends RestoreSecretResponse,
    __MetadataBearer {}
declare const RestoreSecretCommand_base: {
  new (
    input: RestoreSecretCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    RestoreSecretCommandInput,
    RestoreSecretCommandOutput,
    SecretsManagerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: RestoreSecretCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    RestoreSecretCommandInput,
    RestoreSecretCommandOutput,
    SecretsManagerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class RestoreSecretCommand extends RestoreSecretCommand_base {
  protected static __types: {
    api: {
      input: RestoreSecretRequest;
      output: RestoreSecretResponse;
    };
    sdk: {
      input: RestoreSecretCommandInput;
      output: RestoreSecretCommandOutput;
    };
  };
}
