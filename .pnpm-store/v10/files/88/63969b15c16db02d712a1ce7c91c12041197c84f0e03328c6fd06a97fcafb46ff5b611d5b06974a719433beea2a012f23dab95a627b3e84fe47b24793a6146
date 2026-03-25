import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { QueryLineageRequest, QueryLineageResponse } from "../models/models_4";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface QueryLineageCommandInput extends QueryLineageRequest {}
export interface QueryLineageCommandOutput
  extends QueryLineageResponse,
    __MetadataBearer {}
declare const QueryLineageCommand_base: {
  new (
    input: QueryLineageCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    QueryLineageCommandInput,
    QueryLineageCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [QueryLineageCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    QueryLineageCommandInput,
    QueryLineageCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class QueryLineageCommand extends QueryLineageCommand_base {
  protected static __types: {
    api: {
      input: QueryLineageRequest;
      output: QueryLineageResponse;
    };
    sdk: {
      input: QueryLineageCommandInput;
      output: QueryLineageCommandOutput;
    };
  };
}
