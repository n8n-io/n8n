import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListTrialsRequest, ListTrialsResponse } from "../models/models_4";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListTrialsCommandInput extends ListTrialsRequest {}
export interface ListTrialsCommandOutput
  extends ListTrialsResponse,
    __MetadataBearer {}
declare const ListTrialsCommand_base: {
  new (
    input: ListTrialsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListTrialsCommandInput,
    ListTrialsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListTrialsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListTrialsCommandInput,
    ListTrialsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListTrialsCommand extends ListTrialsCommand_base {
  protected static __types: {
    api: {
      input: ListTrialsRequest;
      output: ListTrialsResponse;
    };
    sdk: {
      input: ListTrialsCommandInput;
      output: ListTrialsCommandOutput;
    };
  };
}
