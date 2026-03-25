import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListRecommendationsRequest,
  ListRecommendationsResponse,
} from "../models/models_0";
import {
  ServiceInputTypes,
  ServiceOutputTypes,
  SESv2ClientResolvedConfig,
} from "../SESv2Client";
export { __MetadataBearer };
export { $Command };
export interface ListRecommendationsCommandInput
  extends ListRecommendationsRequest {}
export interface ListRecommendationsCommandOutput
  extends ListRecommendationsResponse,
    __MetadataBearer {}
declare const ListRecommendationsCommand_base: {
  new (
    input: ListRecommendationsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListRecommendationsCommandInput,
    ListRecommendationsCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListRecommendationsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListRecommendationsCommandInput,
    ListRecommendationsCommandOutput,
    SESv2ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListRecommendationsCommand extends ListRecommendationsCommand_base {
  protected static __types: {
    api: {
      input: ListRecommendationsRequest;
      output: ListRecommendationsResponse;
    };
    sdk: {
      input: ListRecommendationsCommandInput;
      output: ListRecommendationsCommandOutput;
    };
  };
}
