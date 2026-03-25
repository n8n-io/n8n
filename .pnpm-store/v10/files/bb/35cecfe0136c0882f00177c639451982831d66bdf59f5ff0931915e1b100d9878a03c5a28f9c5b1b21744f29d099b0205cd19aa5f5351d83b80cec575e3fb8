import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListSuppressedDestinationsRequest,
  ListSuppressedDestinationsResponse,
} from "../models/models_1";
import {
  ServiceInputTypes,
  ServiceOutputTypes,
  SESv2ClientResolvedConfig,
} from "../SESv2Client";
export { __MetadataBearer };
export { $Command };
export interface ListSuppressedDestinationsCommandInput
  extends ListSuppressedDestinationsRequest {}
export interface ListSuppressedDestinationsCommandOutput
  extends ListSuppressedDestinationsResponse,
    __MetadataBearer {}
declare const ListSuppressedDestinationsCommand_base: {
  new (
    input: ListSuppressedDestinationsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListSuppressedDestinationsCommandInput,
    ListSuppressedDestinationsCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListSuppressedDestinationsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListSuppressedDestinationsCommandInput,
    ListSuppressedDestinationsCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListSuppressedDestinationsCommand extends ListSuppressedDestinationsCommand_base {
  protected static __types: {
    api: {
      input: ListSuppressedDestinationsRequest;
      output: ListSuppressedDestinationsResponse;
    };
    sdk: {
      input: ListSuppressedDestinationsCommandInput;
      output: ListSuppressedDestinationsCommandOutput;
    };
  };
}
