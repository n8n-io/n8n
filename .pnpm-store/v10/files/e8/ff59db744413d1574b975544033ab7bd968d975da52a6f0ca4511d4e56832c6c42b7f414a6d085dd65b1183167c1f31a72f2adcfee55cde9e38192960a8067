import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  GetSecretValueRequest,
  GetSecretValueResponse,
} from "../models/models_0";
import {
  SecretsManagerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SecretsManagerClient";
export { __MetadataBearer };
export { $Command };
export interface GetSecretValueCommandInput extends GetSecretValueRequest {}
export interface GetSecretValueCommandOutput
  extends GetSecretValueResponse,
    __MetadataBearer {}
declare const GetSecretValueCommand_base: {
  new (
    input: GetSecretValueCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    GetSecretValueCommandInput,
    GetSecretValueCommandOutput,
    SecretsManagerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: GetSecretValueCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    GetSecretValueCommandInput,
    GetSecretValueCommandOutput,
    SecretsManagerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class GetSecretValueCommand extends GetSecretValueCommand_base {
  protected static __types: {
    api: {
      input: GetSecretValueRequest;
      output: GetSecretValueResponse;
    };
    sdk: {
      input: GetSecretValueCommandInput;
      output: GetSecretValueCommandOutput;
    };
  };
}
