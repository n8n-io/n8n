import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteSecretRequest, DeleteSecretResponse } from "../models/models_0";
import {
  SecretsManagerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SecretsManagerClient";
export { __MetadataBearer };
export { $Command };
export interface DeleteSecretCommandInput extends DeleteSecretRequest {}
export interface DeleteSecretCommandOutput
  extends DeleteSecretResponse,
    __MetadataBearer {}
declare const DeleteSecretCommand_base: {
  new (
    input: DeleteSecretCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    DeleteSecretCommandInput,
    DeleteSecretCommandOutput,
    SecretsManagerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: DeleteSecretCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    DeleteSecretCommandInput,
    DeleteSecretCommandOutput,
    SecretsManagerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class DeleteSecretCommand extends DeleteSecretCommand_base {
  protected static __types: {
    api: {
      input: DeleteSecretRequest;
      output: DeleteSecretResponse;
    };
    sdk: {
      input: DeleteSecretCommandInput;
      output: DeleteSecretCommandOutput;
    };
  };
}
