import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListWorkteamsRequest,
  ListWorkteamsResponse,
} from "../models/models_4";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListWorkteamsCommandInput extends ListWorkteamsRequest {}
export interface ListWorkteamsCommandOutput
  extends ListWorkteamsResponse,
    __MetadataBearer {}
declare const ListWorkteamsCommand_base: {
  new (
    input: ListWorkteamsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListWorkteamsCommandInput,
    ListWorkteamsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListWorkteamsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListWorkteamsCommandInput,
    ListWorkteamsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListWorkteamsCommand extends ListWorkteamsCommand_base {
  protected static __types: {
    api: {
      input: ListWorkteamsRequest;
      output: ListWorkteamsResponse;
    };
    sdk: {
      input: ListWorkteamsCommandInput;
      output: ListWorkteamsCommandOutput;
    };
  };
}
