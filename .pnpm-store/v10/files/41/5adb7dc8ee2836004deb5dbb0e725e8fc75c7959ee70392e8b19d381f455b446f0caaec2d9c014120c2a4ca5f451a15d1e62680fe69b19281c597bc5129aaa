import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { SendEmailRequest, SendEmailResponse } from "../models/models_1";
import {
  ServiceInputTypes,
  ServiceOutputTypes,
  SESv2ClientResolvedConfig,
} from "../SESv2Client";
export { __MetadataBearer };
export { $Command };
export interface SendEmailCommandInput extends SendEmailRequest {}
export interface SendEmailCommandOutput
  extends SendEmailResponse,
    __MetadataBearer {}
declare const SendEmailCommand_base: {
  new (
    input: SendEmailCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    SendEmailCommandInput,
    SendEmailCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: SendEmailCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    SendEmailCommandInput,
    SendEmailCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class SendEmailCommand extends SendEmailCommand_base {
  protected static __types: {
    api: {
      input: SendEmailRequest;
      output: SendEmailResponse;
    };
    sdk: {
      input: SendEmailCommandInput;
      output: SendEmailCommandOutput;
    };
  };
}
