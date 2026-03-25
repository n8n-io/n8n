import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListTenantsRequest, ListTenantsResponse } from "../models/models_1";
import {
  ServiceInputTypes,
  ServiceOutputTypes,
  SESv2ClientResolvedConfig,
} from "../SESv2Client";
export { __MetadataBearer };
export { $Command };
export interface ListTenantsCommandInput extends ListTenantsRequest {}
export interface ListTenantsCommandOutput
  extends ListTenantsResponse,
    __MetadataBearer {}
declare const ListTenantsCommand_base: {
  new (
    input: ListTenantsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListTenantsCommandInput,
    ListTenantsCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListTenantsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListTenantsCommandInput,
    ListTenantsCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListTenantsCommand extends ListTenantsCommand_base {
  protected static __types: {
    api: {
      input: ListTenantsRequest;
      output: ListTenantsResponse;
    };
    sdk: {
      input: ListTenantsCommandInput;
      output: ListTenantsCommandOutput;
    };
  };
}
