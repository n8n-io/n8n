import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListTransformJobsRequest,
  ListTransformJobsResponse,
} from "../models/models_4";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListTransformJobsCommandInput
  extends ListTransformJobsRequest {}
export interface ListTransformJobsCommandOutput
  extends ListTransformJobsResponse,
    __MetadataBearer {}
declare const ListTransformJobsCommand_base: {
  new (
    input: ListTransformJobsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListTransformJobsCommandInput,
    ListTransformJobsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListTransformJobsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListTransformJobsCommandInput,
    ListTransformJobsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListTransformJobsCommand extends ListTransformJobsCommand_base {
  protected static __types: {
    api: {
      input: ListTransformJobsRequest;
      output: ListTransformJobsResponse;
    };
    sdk: {
      input: ListTransformJobsCommandInput;
      output: ListTransformJobsCommandOutput;
    };
  };
}
