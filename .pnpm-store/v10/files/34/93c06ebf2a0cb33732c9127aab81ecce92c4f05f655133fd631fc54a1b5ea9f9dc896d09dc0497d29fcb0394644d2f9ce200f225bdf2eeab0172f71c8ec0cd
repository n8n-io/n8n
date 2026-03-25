import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListAccountsRequest, ListAccountsResponse } from "../models/models_0";
import {
  ServiceInputTypes,
  ServiceOutputTypes,
  SSOClientResolvedConfig,
} from "../SSOClient";
export { __MetadataBearer };
export { $Command };
export interface ListAccountsCommandInput extends ListAccountsRequest {}
export interface ListAccountsCommandOutput
  extends ListAccountsResponse,
    __MetadataBearer {}
declare const ListAccountsCommand_base: {
  new (
    input: ListAccountsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListAccountsCommandInput,
    ListAccountsCommandOutput,
    SSOClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: ListAccountsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListAccountsCommandInput,
    ListAccountsCommandOutput,
    SSOClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListAccountsCommand extends ListAccountsCommand_base {
  protected static __types: {
    api: {
      input: ListAccountsRequest;
      output: ListAccountsResponse;
    };
    sdk: {
      input: ListAccountsCommandInput;
      output: ListAccountsCommandOutput;
    };
  };
}
