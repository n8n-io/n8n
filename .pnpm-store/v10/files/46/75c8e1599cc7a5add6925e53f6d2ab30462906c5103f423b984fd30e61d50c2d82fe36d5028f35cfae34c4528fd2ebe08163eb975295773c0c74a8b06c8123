import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListFeatureGroupsRequest,
  ListFeatureGroupsResponse,
} from "../models/models_3";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListFeatureGroupsCommandInput
  extends ListFeatureGroupsRequest {}
export interface ListFeatureGroupsCommandOutput
  extends ListFeatureGroupsResponse,
    __MetadataBearer {}
declare const ListFeatureGroupsCommand_base: {
  new (
    input: ListFeatureGroupsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListFeatureGroupsCommandInput,
    ListFeatureGroupsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListFeatureGroupsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListFeatureGroupsCommandInput,
    ListFeatureGroupsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListFeatureGroupsCommand extends ListFeatureGroupsCommand_base {
  protected static __types: {
    api: {
      input: ListFeatureGroupsRequest;
      output: ListFeatureGroupsResponse;
    };
    sdk: {
      input: ListFeatureGroupsCommandInput;
      output: ListFeatureGroupsCommandOutput;
    };
  };
}
