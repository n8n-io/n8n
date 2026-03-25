import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListUserProfilesRequest,
  ListUserProfilesResponse,
} from "../models/models_4";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListUserProfilesCommandInput extends ListUserProfilesRequest {}
export interface ListUserProfilesCommandOutput
  extends ListUserProfilesResponse,
    __MetadataBearer {}
declare const ListUserProfilesCommand_base: {
  new (
    input: ListUserProfilesCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListUserProfilesCommandInput,
    ListUserProfilesCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListUserProfilesCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListUserProfilesCommandInput,
    ListUserProfilesCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListUserProfilesCommand extends ListUserProfilesCommand_base {
  protected static __types: {
    api: {
      input: ListUserProfilesRequest;
      output: ListUserProfilesResponse;
    };
    sdk: {
      input: ListUserProfilesCommandInput;
      output: ListUserProfilesCommandOutput;
    };
  };
}
