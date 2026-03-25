import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  PutAccountSendingAttributesRequest,
  PutAccountSendingAttributesResponse,
} from "../models/models_1";
import {
  ServiceInputTypes,
  ServiceOutputTypes,
  SESv2ClientResolvedConfig,
} from "../SESv2Client";
export { __MetadataBearer };
export { $Command };
export interface PutAccountSendingAttributesCommandInput
  extends PutAccountSendingAttributesRequest {}
export interface PutAccountSendingAttributesCommandOutput
  extends PutAccountSendingAttributesResponse,
    __MetadataBearer {}
declare const PutAccountSendingAttributesCommand_base: {
  new (
    input: PutAccountSendingAttributesCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    PutAccountSendingAttributesCommandInput,
    PutAccountSendingAttributesCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [PutAccountSendingAttributesCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    PutAccountSendingAttributesCommandInput,
    PutAccountSendingAttributesCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class PutAccountSendingAttributesCommand extends PutAccountSendingAttributesCommand_base {
  protected static __types: {
    api: {
      input: PutAccountSendingAttributesRequest;
      output: {};
    };
    sdk: {
      input: PutAccountSendingAttributesCommandInput;
      output: PutAccountSendingAttributesCommandOutput;
    };
  };
}
