import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListConfigurationSetsRequest,
  ListConfigurationSetsResponse,
} from "../models/models_0";
import {
  ServiceInputTypes,
  ServiceOutputTypes,
  SESv2ClientResolvedConfig,
} from "../SESv2Client";
export { __MetadataBearer };
export { $Command };
export interface ListConfigurationSetsCommandInput
  extends ListConfigurationSetsRequest {}
export interface ListConfigurationSetsCommandOutput
  extends ListConfigurationSetsResponse,
    __MetadataBearer {}
declare const ListConfigurationSetsCommand_base: {
  new (
    input: ListConfigurationSetsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListConfigurationSetsCommandInput,
    ListConfigurationSetsCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListConfigurationSetsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListConfigurationSetsCommandInput,
    ListConfigurationSetsCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListConfigurationSetsCommand extends ListConfigurationSetsCommand_base {
  protected static __types: {
    api: {
      input: ListConfigurationSetsRequest;
      output: ListConfigurationSetsResponse;
    };
    sdk: {
      input: ListConfigurationSetsCommandInput;
      output: ListConfigurationSetsCommandOutput;
    };
  };
}
