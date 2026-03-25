import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetContactRequest, GetContactResponse } from "../models/models_0";
import {
  ServiceInputTypes,
  ServiceOutputTypes,
  SESv2ClientResolvedConfig,
} from "../SESv2Client";
export { __MetadataBearer };
export { $Command };
export interface GetContactCommandInput extends GetContactRequest {}
export interface GetContactCommandOutput
  extends GetContactResponse,
    __MetadataBearer {}
declare const GetContactCommand_base: {
  new (
    input: GetContactCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    GetContactCommandInput,
    GetContactCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: GetContactCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    GetContactCommandInput,
    GetContactCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class GetContactCommand extends GetContactCommand_base {
  protected static __types: {
    api: {
      input: GetContactRequest;
      output: GetContactResponse;
    };
    sdk: {
      input: GetContactCommandInput;
      output: GetContactCommandOutput;
    };
  };
}
