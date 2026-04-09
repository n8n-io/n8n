import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListComputeQuotasRequest,
  ListComputeQuotasResponse,
} from "../models/models_3";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListComputeQuotasCommandInput
  extends ListComputeQuotasRequest {}
export interface ListComputeQuotasCommandOutput
  extends ListComputeQuotasResponse,
    __MetadataBearer {}
declare const ListComputeQuotasCommand_base: {
  new (
    input: ListComputeQuotasCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListComputeQuotasCommandInput,
    ListComputeQuotasCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListComputeQuotasCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListComputeQuotasCommandInput,
    ListComputeQuotasCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListComputeQuotasCommand extends ListComputeQuotasCommand_base {
  protected static __types: {
    api: {
      input: ListComputeQuotasRequest;
      output: ListComputeQuotasResponse;
    };
    sdk: {
      input: ListComputeQuotasCommandInput;
      output: ListComputeQuotasCommandOutput;
    };
  };
}
