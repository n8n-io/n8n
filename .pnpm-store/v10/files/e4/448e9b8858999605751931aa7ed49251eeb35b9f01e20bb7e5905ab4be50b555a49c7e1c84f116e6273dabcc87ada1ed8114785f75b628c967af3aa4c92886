import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateSecretRequest, CreateSecretResponse } from "../models/models_0";
import {
  SecretsManagerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SecretsManagerClient";
export { __MetadataBearer };
export { $Command };
export interface CreateSecretCommandInput extends CreateSecretRequest {}
export interface CreateSecretCommandOutput
  extends CreateSecretResponse,
    __MetadataBearer {}
declare const CreateSecretCommand_base: {
  new (
    input: CreateSecretCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    CreateSecretCommandInput,
    CreateSecretCommandOutput,
    SecretsManagerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: CreateSecretCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    CreateSecretCommandInput,
    CreateSecretCommandOutput,
    SecretsManagerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class CreateSecretCommand extends CreateSecretCommand_base {
  protected static __types: {
    api: {
      input: CreateSecretRequest;
      output: CreateSecretResponse;
    };
    sdk: {
      input: CreateSecretCommandInput;
      output: CreateSecretCommandOutput;
    };
  };
}
