import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListContactListsRequest,
  ListContactListsResponse,
} from "../models/models_0";
import {
  ServiceInputTypes,
  ServiceOutputTypes,
  SESv2ClientResolvedConfig,
} from "../SESv2Client";
export { __MetadataBearer };
export { $Command };
export interface ListContactListsCommandInput extends ListContactListsRequest {}
export interface ListContactListsCommandOutput
  extends ListContactListsResponse,
    __MetadataBearer {}
declare const ListContactListsCommand_base: {
  new (
    input: ListContactListsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListContactListsCommandInput,
    ListContactListsCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListContactListsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListContactListsCommandInput,
    ListContactListsCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListContactListsCommand extends ListContactListsCommand_base {
  protected static __types: {
    api: {
      input: ListContactListsRequest;
      output: ListContactListsResponse;
    };
    sdk: {
      input: ListContactListsCommandInput;
      output: ListContactListsCommandOutput;
    };
  };
}
