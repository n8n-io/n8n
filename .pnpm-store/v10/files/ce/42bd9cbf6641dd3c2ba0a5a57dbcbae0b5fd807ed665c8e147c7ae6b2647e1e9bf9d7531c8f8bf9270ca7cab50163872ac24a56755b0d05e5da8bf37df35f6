import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListSecretsRequest, ListSecretsResponse } from "../models/models_0";
import {
  SecretsManagerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SecretsManagerClient";
export { __MetadataBearer };
export { $Command };
export interface ListSecretsCommandInput extends ListSecretsRequest {}
export interface ListSecretsCommandOutput
  extends ListSecretsResponse,
    __MetadataBearer {}
declare const ListSecretsCommand_base: {
  new (
    input: ListSecretsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListSecretsCommandInput,
    ListSecretsCommandOutput,
    SecretsManagerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListSecretsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListSecretsCommandInput,
    ListSecretsCommandOutput,
    SecretsManagerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListSecretsCommand extends ListSecretsCommand_base {
  protected static __types: {
    api: {
      input: ListSecretsRequest;
      output: ListSecretsResponse;
    };
    sdk: {
      input: ListSecretsCommandInput;
      output: ListSecretsCommandOutput;
    };
  };
}
