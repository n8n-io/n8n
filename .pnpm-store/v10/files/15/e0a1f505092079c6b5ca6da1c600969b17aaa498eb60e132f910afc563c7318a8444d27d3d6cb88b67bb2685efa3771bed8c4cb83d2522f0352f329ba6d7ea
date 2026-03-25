import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateAppRequest, CreateAppResponse } from "../models/models_1";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface CreateAppCommandInput extends CreateAppRequest {}
export interface CreateAppCommandOutput
  extends CreateAppResponse,
    __MetadataBearer {}
declare const CreateAppCommand_base: {
  new (
    input: CreateAppCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    CreateAppCommandInput,
    CreateAppCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: CreateAppCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    CreateAppCommandInput,
    CreateAppCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class CreateAppCommand extends CreateAppCommand_base {
  protected static __types: {
    api: {
      input: CreateAppRequest;
      output: CreateAppResponse;
    };
    sdk: {
      input: CreateAppCommandInput;
      output: CreateAppCommandOutput;
    };
  };
}
