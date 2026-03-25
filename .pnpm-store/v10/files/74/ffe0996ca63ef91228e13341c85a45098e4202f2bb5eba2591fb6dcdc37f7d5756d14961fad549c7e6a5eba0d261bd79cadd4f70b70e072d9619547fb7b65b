import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListNotebookInstancesInput,
  ListNotebookInstancesOutput,
} from "../models/models_4";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListNotebookInstancesCommandInput
  extends ListNotebookInstancesInput {}
export interface ListNotebookInstancesCommandOutput
  extends ListNotebookInstancesOutput,
    __MetadataBearer {}
declare const ListNotebookInstancesCommand_base: {
  new (
    input: ListNotebookInstancesCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListNotebookInstancesCommandInput,
    ListNotebookInstancesCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListNotebookInstancesCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListNotebookInstancesCommandInput,
    ListNotebookInstancesCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListNotebookInstancesCommand extends ListNotebookInstancesCommand_base {
  protected static __types: {
    api: {
      input: ListNotebookInstancesInput;
      output: ListNotebookInstancesOutput;
    };
    sdk: {
      input: ListNotebookInstancesCommandInput;
      output: ListNotebookInstancesCommandOutput;
    };
  };
}
