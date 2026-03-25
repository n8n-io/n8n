import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListReputationEntitiesRequest,
  ListReputationEntitiesResponse,
} from "../models/models_0";
import {
  ServiceInputTypes,
  ServiceOutputTypes,
  SESv2ClientResolvedConfig,
} from "../SESv2Client";
export { __MetadataBearer };
export { $Command };
export interface ListReputationEntitiesCommandInput
  extends ListReputationEntitiesRequest {}
export interface ListReputationEntitiesCommandOutput
  extends ListReputationEntitiesResponse,
    __MetadataBearer {}
declare const ListReputationEntitiesCommand_base: {
  new (
    input: ListReputationEntitiesCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListReputationEntitiesCommandInput,
    ListReputationEntitiesCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListReputationEntitiesCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListReputationEntitiesCommandInput,
    ListReputationEntitiesCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListReputationEntitiesCommand extends ListReputationEntitiesCommand_base {
  protected static __types: {
    api: {
      input: ListReputationEntitiesRequest;
      output: ListReputationEntitiesResponse;
    };
    sdk: {
      input: ListReputationEntitiesCommandInput;
      output: ListReputationEntitiesCommandOutput;
    };
  };
}
