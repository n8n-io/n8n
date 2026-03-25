import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListClustersRequest, ListClustersResponse } from "../models/models_3";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListClustersCommandInput extends ListClustersRequest {}
export interface ListClustersCommandOutput
  extends ListClustersResponse,
    __MetadataBearer {}
declare const ListClustersCommand_base: {
  new (
    input: ListClustersCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListClustersCommandInput,
    ListClustersCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListClustersCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListClustersCommandInput,
    ListClustersCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListClustersCommand extends ListClustersCommand_base {
  protected static __types: {
    api: {
      input: ListClustersRequest;
      output: ListClustersResponse;
    };
    sdk: {
      input: ListClustersCommandInput;
      output: ListClustersCommandOutput;
    };
  };
}
