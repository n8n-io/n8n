import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { SearchRequest, SearchResponse } from "../models/models_4";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface SearchCommandInput extends SearchRequest {}
export interface SearchCommandOutput extends SearchResponse, __MetadataBearer {}
declare const SearchCommand_base: {
  new (input: SearchCommandInput): import("@smithy/smithy-client").CommandImpl<
    SearchCommandInput,
    SearchCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (input: SearchCommandInput): import("@smithy/smithy-client").CommandImpl<
    SearchCommandInput,
    SearchCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class SearchCommand extends SearchCommand_base {
  protected static __types: {
    api: {
      input: SearchRequest;
      output: SearchResponse;
    };
    sdk: {
      input: SearchCommandInput;
      output: SearchCommandOutput;
    };
  };
}
