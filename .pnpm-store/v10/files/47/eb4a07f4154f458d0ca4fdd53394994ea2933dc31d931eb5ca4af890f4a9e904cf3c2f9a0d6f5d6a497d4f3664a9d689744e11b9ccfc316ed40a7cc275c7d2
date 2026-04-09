import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { StartSessionRequest, StartSessionResponse } from "../models/models_4";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface StartSessionCommandInput extends StartSessionRequest {}
export interface StartSessionCommandOutput
  extends StartSessionResponse,
    __MetadataBearer {}
declare const StartSessionCommand_base: {
  new (
    input: StartSessionCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    StartSessionCommandInput,
    StartSessionCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: StartSessionCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    StartSessionCommandInput,
    StartSessionCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class StartSessionCommand extends StartSessionCommand_base {
  protected static __types: {
    api: {
      input: StartSessionRequest;
      output: StartSessionResponse;
    };
    sdk: {
      input: StartSessionCommandInput;
      output: StartSessionCommandOutput;
    };
  };
}
