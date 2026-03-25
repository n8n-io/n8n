import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListEndpointsInput, ListEndpointsOutput } from "../models/models_4";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListEndpointsCommandInput extends ListEndpointsInput {}
export interface ListEndpointsCommandOutput
  extends ListEndpointsOutput,
    __MetadataBearer {}
declare const ListEndpointsCommand_base: {
  new (
    input: ListEndpointsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListEndpointsCommandInput,
    ListEndpointsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListEndpointsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListEndpointsCommandInput,
    ListEndpointsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListEndpointsCommand extends ListEndpointsCommand_base {
  protected static __types: {
    api: {
      input: ListEndpointsInput;
      output: ListEndpointsOutput;
    };
    sdk: {
      input: ListEndpointsCommandInput;
      output: ListEndpointsCommandOutput;
    };
  };
}
