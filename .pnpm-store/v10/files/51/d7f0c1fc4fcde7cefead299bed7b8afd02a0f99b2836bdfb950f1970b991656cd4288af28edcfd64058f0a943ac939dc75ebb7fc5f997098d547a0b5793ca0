import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  KendraClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../KendraClient";
import {
  CreateDataSourceRequest,
  CreateDataSourceResponse,
} from "../models/models_0";
export { __MetadataBearer };
export { $Command };
export interface CreateDataSourceCommandInput extends CreateDataSourceRequest {}
export interface CreateDataSourceCommandOutput
  extends CreateDataSourceResponse,
    __MetadataBearer {}
declare const CreateDataSourceCommand_base: {
  new (
    input: CreateDataSourceCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    CreateDataSourceCommandInput,
    CreateDataSourceCommandOutput,
    KendraClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: CreateDataSourceCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    CreateDataSourceCommandInput,
    CreateDataSourceCommandOutput,
    KendraClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class CreateDataSourceCommand extends CreateDataSourceCommand_base {
  protected static __types: {
    api: {
      input: CreateDataSourceRequest;
      output: CreateDataSourceResponse;
    };
    sdk: {
      input: CreateDataSourceCommandInput;
      output: CreateDataSourceCommandOutput;
    };
  };
}
