import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  KendraClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../KendraClient";
import {
  ListDataSourcesRequest,
  ListDataSourcesResponse,
} from "../models/models_0";
export { __MetadataBearer };
export { $Command };
export interface ListDataSourcesCommandInput extends ListDataSourcesRequest {}
export interface ListDataSourcesCommandOutput
  extends ListDataSourcesResponse,
    __MetadataBearer {}
declare const ListDataSourcesCommand_base: {
  new (
    input: ListDataSourcesCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListDataSourcesCommandInput,
    ListDataSourcesCommandOutput,
    KendraClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: ListDataSourcesCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListDataSourcesCommandInput,
    ListDataSourcesCommandOutput,
    KendraClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListDataSourcesCommand extends ListDataSourcesCommand_base {
  protected static __types: {
    api: {
      input: ListDataSourcesRequest;
      output: ListDataSourcesResponse;
    };
    sdk: {
      input: ListDataSourcesCommandInput;
      output: ListDataSourcesCommandOutput;
    };
  };
}
