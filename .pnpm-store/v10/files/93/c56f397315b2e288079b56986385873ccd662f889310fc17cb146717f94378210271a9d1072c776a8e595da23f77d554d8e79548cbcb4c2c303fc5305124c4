import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListArtifactsRequest,
  ListArtifactsResponse,
} from "../models/models_3";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListArtifactsCommandInput extends ListArtifactsRequest {}
export interface ListArtifactsCommandOutput
  extends ListArtifactsResponse,
    __MetadataBearer {}
declare const ListArtifactsCommand_base: {
  new (
    input: ListArtifactsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListArtifactsCommandInput,
    ListArtifactsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListArtifactsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListArtifactsCommandInput,
    ListArtifactsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListArtifactsCommand extends ListArtifactsCommand_base {
  protected static __types: {
    api: {
      input: ListArtifactsRequest;
      output: ListArtifactsResponse;
    };
    sdk: {
      input: ListArtifactsCommandInput;
      output: ListArtifactsCommandOutput;
    };
  };
}
