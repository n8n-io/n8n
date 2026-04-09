import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListLineageGroupsRequest,
  ListLineageGroupsResponse,
} from "../models/models_3";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListLineageGroupsCommandInput
  extends ListLineageGroupsRequest {}
export interface ListLineageGroupsCommandOutput
  extends ListLineageGroupsResponse,
    __MetadataBearer {}
declare const ListLineageGroupsCommand_base: {
  new (
    input: ListLineageGroupsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListLineageGroupsCommandInput,
    ListLineageGroupsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListLineageGroupsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListLineageGroupsCommandInput,
    ListLineageGroupsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListLineageGroupsCommand extends ListLineageGroupsCommand_base {
  protected static __types: {
    api: {
      input: ListLineageGroupsRequest;
      output: ListLineageGroupsResponse;
    };
    sdk: {
      input: ListLineageGroupsCommandInput;
      output: ListLineageGroupsCommandOutput;
    };
  };
}
