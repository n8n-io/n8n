import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListEmailTemplatesRequest,
  ListEmailTemplatesResponse,
} from "../models/models_0";
import {
  ServiceInputTypes,
  ServiceOutputTypes,
  SESv2ClientResolvedConfig,
} from "../SESv2Client";
export { __MetadataBearer };
export { $Command };
export interface ListEmailTemplatesCommandInput
  extends ListEmailTemplatesRequest {}
export interface ListEmailTemplatesCommandOutput
  extends ListEmailTemplatesResponse,
    __MetadataBearer {}
declare const ListEmailTemplatesCommand_base: {
  new (
    input: ListEmailTemplatesCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListEmailTemplatesCommandInput,
    ListEmailTemplatesCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListEmailTemplatesCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListEmailTemplatesCommandInput,
    ListEmailTemplatesCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListEmailTemplatesCommand extends ListEmailTemplatesCommand_base {
  protected static __types: {
    api: {
      input: ListEmailTemplatesRequest;
      output: ListEmailTemplatesResponse;
    };
    sdk: {
      input: ListEmailTemplatesCommandInput;
      output: ListEmailTemplatesCommandOutput;
    };
  };
}
