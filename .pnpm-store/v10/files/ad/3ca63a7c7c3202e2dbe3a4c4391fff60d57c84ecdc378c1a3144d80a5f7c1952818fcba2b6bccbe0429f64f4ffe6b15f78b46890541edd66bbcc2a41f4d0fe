import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  CreateContactRequest,
  CreateContactResponse,
} from "../models/models_0";
import {
  ServiceInputTypes,
  ServiceOutputTypes,
  SESv2ClientResolvedConfig,
} from "../SESv2Client";
export { __MetadataBearer };
export { $Command };
export interface CreateContactCommandInput extends CreateContactRequest {}
export interface CreateContactCommandOutput
  extends CreateContactResponse,
    __MetadataBearer {}
declare const CreateContactCommand_base: {
  new (
    input: CreateContactCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    CreateContactCommandInput,
    CreateContactCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: CreateContactCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    CreateContactCommandInput,
    CreateContactCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class CreateContactCommand extends CreateContactCommand_base {
  protected static __types: {
    api: {
      input: CreateContactRequest;
      output: {};
    };
    sdk: {
      input: CreateContactCommandInput;
      output: CreateContactCommandOutput;
    };
  };
}
