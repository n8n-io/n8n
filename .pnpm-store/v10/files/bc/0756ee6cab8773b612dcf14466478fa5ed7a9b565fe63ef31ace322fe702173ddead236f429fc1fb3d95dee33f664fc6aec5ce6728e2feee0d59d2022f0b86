import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListAssociationsRequest,
  ListAssociationsResponse,
} from "../models/models_3";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListAssociationsCommandInput extends ListAssociationsRequest {}
export interface ListAssociationsCommandOutput
  extends ListAssociationsResponse,
    __MetadataBearer {}
declare const ListAssociationsCommand_base: {
  new (
    input: ListAssociationsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListAssociationsCommandInput,
    ListAssociationsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListAssociationsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListAssociationsCommandInput,
    ListAssociationsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListAssociationsCommand extends ListAssociationsCommand_base {
  protected static __types: {
    api: {
      input: ListAssociationsRequest;
      output: ListAssociationsResponse;
    };
    sdk: {
      input: ListAssociationsCommandInput;
      output: ListAssociationsCommandOutput;
    };
  };
}
