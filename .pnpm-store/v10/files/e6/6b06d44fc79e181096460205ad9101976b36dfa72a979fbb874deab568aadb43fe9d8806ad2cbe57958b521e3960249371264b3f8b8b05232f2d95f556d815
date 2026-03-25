import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListEmailIdentitiesRequest,
  ListEmailIdentitiesResponse,
} from "../models/models_0";
import {
  ServiceInputTypes,
  ServiceOutputTypes,
  SESv2ClientResolvedConfig,
} from "../SESv2Client";
export { __MetadataBearer };
export { $Command };
export interface ListEmailIdentitiesCommandInput
  extends ListEmailIdentitiesRequest {}
export interface ListEmailIdentitiesCommandOutput
  extends ListEmailIdentitiesResponse,
    __MetadataBearer {}
declare const ListEmailIdentitiesCommand_base: {
  new (
    input: ListEmailIdentitiesCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListEmailIdentitiesCommandInput,
    ListEmailIdentitiesCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListEmailIdentitiesCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListEmailIdentitiesCommandInput,
    ListEmailIdentitiesCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListEmailIdentitiesCommand extends ListEmailIdentitiesCommand_base {
  protected static __types: {
    api: {
      input: ListEmailIdentitiesRequest;
      output: ListEmailIdentitiesResponse;
    };
    sdk: {
      input: ListEmailIdentitiesCommandInput;
      output: ListEmailIdentitiesCommandOutput;
    };
  };
}
