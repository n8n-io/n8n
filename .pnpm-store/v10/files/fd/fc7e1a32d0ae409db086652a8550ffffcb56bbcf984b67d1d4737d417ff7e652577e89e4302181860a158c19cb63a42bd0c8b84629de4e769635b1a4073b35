import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  KendraClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../KendraClient";
import { QueryRequest, QueryResult } from "../models/models_0";
export { __MetadataBearer };
export { $Command };
export interface QueryCommandInput extends QueryRequest {}
export interface QueryCommandOutput extends QueryResult, __MetadataBearer {}
declare const QueryCommand_base: {
  new (input: QueryCommandInput): import("@smithy/smithy-client").CommandImpl<
    QueryCommandInput,
    QueryCommandOutput,
    KendraClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (input: QueryCommandInput): import("@smithy/smithy-client").CommandImpl<
    QueryCommandInput,
    QueryCommandOutput,
    KendraClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class QueryCommand extends QueryCommand_base {
  protected static __types: {
    api: {
      input: QueryRequest;
      output: QueryResult;
    };
    sdk: {
      input: QueryCommandInput;
      output: QueryCommandOutput;
    };
  };
}
