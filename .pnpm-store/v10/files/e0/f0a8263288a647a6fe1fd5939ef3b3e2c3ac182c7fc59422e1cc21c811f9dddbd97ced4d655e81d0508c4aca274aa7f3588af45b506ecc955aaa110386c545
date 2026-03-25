import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateImageRequest, CreateImageResponse } from "../models/models_1";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface CreateImageCommandInput extends CreateImageRequest {}
export interface CreateImageCommandOutput
  extends CreateImageResponse,
    __MetadataBearer {}
declare const CreateImageCommand_base: {
  new (
    input: CreateImageCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    CreateImageCommandInput,
    CreateImageCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: CreateImageCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    CreateImageCommandInput,
    CreateImageCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class CreateImageCommand extends CreateImageCommand_base {
  protected static __types: {
    api: {
      input: CreateImageRequest;
      output: CreateImageResponse;
    };
    sdk: {
      input: CreateImageCommandInput;
      output: CreateImageCommandOutput;
    };
  };
}
