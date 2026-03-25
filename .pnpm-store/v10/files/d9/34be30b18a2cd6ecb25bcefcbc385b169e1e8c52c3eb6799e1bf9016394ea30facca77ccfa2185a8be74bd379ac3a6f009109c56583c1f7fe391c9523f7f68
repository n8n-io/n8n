import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { TagResourceRequest, TagResourceResponse } from "../models/models_1";
import {
  ServiceInputTypes,
  ServiceOutputTypes,
  SESv2ClientResolvedConfig,
} from "../SESv2Client";
export { __MetadataBearer };
export { $Command };
export interface TagResourceCommandInput extends TagResourceRequest {}
export interface TagResourceCommandOutput
  extends TagResourceResponse,
    __MetadataBearer {}
declare const TagResourceCommand_base: {
  new (
    input: TagResourceCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    TagResourceCommandInput,
    TagResourceCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: TagResourceCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    TagResourceCommandInput,
    TagResourceCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class TagResourceCommand extends TagResourceCommand_base {
  protected static __types: {
    api: {
      input: TagResourceRequest;
      output: {};
    };
    sdk: {
      input: TagResourceCommandInput;
      output: TagResourceCommandOutput;
    };
  };
}
