import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListContactsRequest, ListContactsResponse } from "../models/models_0";
import {
  ServiceInputTypes,
  ServiceOutputTypes,
  SESv2ClientResolvedConfig,
} from "../SESv2Client";
export { __MetadataBearer };
export { $Command };
export interface ListContactsCommandInput extends ListContactsRequest {}
export interface ListContactsCommandOutput
  extends ListContactsResponse,
    __MetadataBearer {}
declare const ListContactsCommand_base: {
  new (
    input: ListContactsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListContactsCommandInput,
    ListContactsCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: ListContactsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListContactsCommandInput,
    ListContactsCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListContactsCommand extends ListContactsCommand_base {
  protected static __types: {
    api: {
      input: ListContactsRequest;
      output: ListContactsResponse;
    };
    sdk: {
      input: ListContactsCommandInput;
      output: ListContactsCommandOutput;
    };
  };
}
