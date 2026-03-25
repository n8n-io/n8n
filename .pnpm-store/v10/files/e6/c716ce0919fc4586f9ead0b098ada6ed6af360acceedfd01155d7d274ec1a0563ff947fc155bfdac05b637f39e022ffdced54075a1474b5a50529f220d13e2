import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListDedicatedIpPoolsRequest,
  ListDedicatedIpPoolsResponse,
} from "../models/models_0";
import {
  ServiceInputTypes,
  ServiceOutputTypes,
  SESv2ClientResolvedConfig,
} from "../SESv2Client";
export { __MetadataBearer };
export { $Command };
export interface ListDedicatedIpPoolsCommandInput
  extends ListDedicatedIpPoolsRequest {}
export interface ListDedicatedIpPoolsCommandOutput
  extends ListDedicatedIpPoolsResponse,
    __MetadataBearer {}
declare const ListDedicatedIpPoolsCommand_base: {
  new (
    input: ListDedicatedIpPoolsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListDedicatedIpPoolsCommandInput,
    ListDedicatedIpPoolsCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListDedicatedIpPoolsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListDedicatedIpPoolsCommandInput,
    ListDedicatedIpPoolsCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListDedicatedIpPoolsCommand extends ListDedicatedIpPoolsCommand_base {
  protected static __types: {
    api: {
      input: ListDedicatedIpPoolsRequest;
      output: ListDedicatedIpPoolsResponse;
    };
    sdk: {
      input: ListDedicatedIpPoolsCommandInput;
      output: ListDedicatedIpPoolsCommandOutput;
    };
  };
}
