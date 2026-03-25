import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  KendraClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../KendraClient";
import { CreateIndexRequest, CreateIndexResponse } from "../models/models_0";
export { __MetadataBearer };
export { $Command };
export interface CreateIndexCommandInput extends CreateIndexRequest {}
export interface CreateIndexCommandOutput
  extends CreateIndexResponse,
    __MetadataBearer {}
declare const CreateIndexCommand_base: {
  new (
    input: CreateIndexCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    CreateIndexCommandInput,
    CreateIndexCommandOutput,
    KendraClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: CreateIndexCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    CreateIndexCommandInput,
    CreateIndexCommandOutput,
    KendraClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class CreateIndexCommand extends CreateIndexCommand_base {
  protected static __types: {
    api: {
      input: CreateIndexRequest;
      output: CreateIndexResponse;
    };
    sdk: {
      input: CreateIndexCommandInput;
      output: CreateIndexCommandOutput;
    };
  };
}
