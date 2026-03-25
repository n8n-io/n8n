import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListProjectsInput, ListProjectsOutput } from "../models/models_4";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListProjectsCommandInput extends ListProjectsInput {}
export interface ListProjectsCommandOutput
  extends ListProjectsOutput,
    __MetadataBearer {}
declare const ListProjectsCommand_base: {
  new (
    input: ListProjectsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListProjectsCommandInput,
    ListProjectsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListProjectsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListProjectsCommandInput,
    ListProjectsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListProjectsCommand extends ListProjectsCommand_base {
  protected static __types: {
    api: {
      input: ListProjectsInput;
      output: ListProjectsOutput;
    };
    sdk: {
      input: ListProjectsCommandInput;
      output: ListProjectsCommandOutput;
    };
  };
}
