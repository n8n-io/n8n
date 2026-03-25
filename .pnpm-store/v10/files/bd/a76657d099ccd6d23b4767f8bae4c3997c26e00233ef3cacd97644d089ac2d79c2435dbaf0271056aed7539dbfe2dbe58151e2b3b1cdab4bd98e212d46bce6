import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  SendBulkEmailRequest,
  SendBulkEmailResponse,
} from "../models/models_1";
import {
  ServiceInputTypes,
  ServiceOutputTypes,
  SESv2ClientResolvedConfig,
} from "../SESv2Client";
export { __MetadataBearer };
export { $Command };
export interface SendBulkEmailCommandInput extends SendBulkEmailRequest {}
export interface SendBulkEmailCommandOutput
  extends SendBulkEmailResponse,
    __MetadataBearer {}
declare const SendBulkEmailCommand_base: {
  new (
    input: SendBulkEmailCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    SendBulkEmailCommandInput,
    SendBulkEmailCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: SendBulkEmailCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    SendBulkEmailCommandInput,
    SendBulkEmailCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class SendBulkEmailCommand extends SendBulkEmailCommand_base {
  protected static __types: {
    api: {
      input: SendBulkEmailRequest;
      output: SendBulkEmailResponse;
    };
    sdk: {
      input: SendBulkEmailCommandInput;
      output: SendBulkEmailCommandOutput;
    };
  };
}
