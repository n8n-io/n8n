import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetAccountRequest, GetAccountResponse } from "../models/models_0";
import {
  ServiceInputTypes,
  ServiceOutputTypes,
  SESv2ClientResolvedConfig,
} from "../SESv2Client";
export { __MetadataBearer };
export { $Command };
export interface GetAccountCommandInput extends GetAccountRequest {}
export interface GetAccountCommandOutput
  extends GetAccountResponse,
    __MetadataBearer {}
declare const GetAccountCommand_base: {
  new (
    input: GetAccountCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    GetAccountCommandInput,
    GetAccountCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [GetAccountCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    GetAccountCommandInput,
    GetAccountCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class GetAccountCommand extends GetAccountCommand_base {
  protected static __types: {
    api: {
      input: {};
      output: GetAccountResponse;
    };
    sdk: {
      input: GetAccountCommandInput;
      output: GetAccountCommandOutput;
    };
  };
}
