import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { UpdateSecretRequest, UpdateSecretResponse } from "../models/models_0";
import {
  SecretsManagerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SecretsManagerClient";
export { __MetadataBearer };
export { $Command };
export interface UpdateSecretCommandInput extends UpdateSecretRequest {}
export interface UpdateSecretCommandOutput
  extends UpdateSecretResponse,
    __MetadataBearer {}
declare const UpdateSecretCommand_base: {
  new (
    input: UpdateSecretCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    UpdateSecretCommandInput,
    UpdateSecretCommandOutput,
    SecretsManagerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: UpdateSecretCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    UpdateSecretCommandInput,
    UpdateSecretCommandOutput,
    SecretsManagerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class UpdateSecretCommand extends UpdateSecretCommand_base {
  protected static __types: {
    api: {
      input: UpdateSecretRequest;
      output: UpdateSecretResponse;
    };
    sdk: {
      input: UpdateSecretCommandInput;
      output: UpdateSecretCommandOutput;
    };
  };
}
