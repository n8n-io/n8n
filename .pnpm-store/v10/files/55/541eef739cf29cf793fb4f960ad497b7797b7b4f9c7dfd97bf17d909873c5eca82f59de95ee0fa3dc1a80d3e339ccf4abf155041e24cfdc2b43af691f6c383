import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  KendraClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../KendraClient";
import { TagResourceRequest, TagResourceResponse } from "../models/models_0";
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
    KendraClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: TagResourceCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    TagResourceCommandInput,
    TagResourceCommandOutput,
    KendraClientResolvedConfig,
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
