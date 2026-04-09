import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListModelCardsRequest,
  ListModelCardsResponse,
} from "../models/models_3";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListModelCardsCommandInput extends ListModelCardsRequest {}
export interface ListModelCardsCommandOutput
  extends ListModelCardsResponse,
    __MetadataBearer {}
declare const ListModelCardsCommand_base: {
  new (
    input: ListModelCardsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListModelCardsCommandInput,
    ListModelCardsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListModelCardsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListModelCardsCommandInput,
    ListModelCardsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListModelCardsCommand extends ListModelCardsCommand_base {
  protected static __types: {
    api: {
      input: ListModelCardsRequest;
      output: ListModelCardsResponse;
    };
    sdk: {
      input: ListModelCardsCommandInput;
      output: ListModelCardsCommandOutput;
    };
  };
}
