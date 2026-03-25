import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  DeleteArtifactRequest,
  DeleteArtifactResponse,
} from "../models/models_2";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface DeleteArtifactCommandInput extends DeleteArtifactRequest {}
export interface DeleteArtifactCommandOutput
  extends DeleteArtifactResponse,
    __MetadataBearer {}
declare const DeleteArtifactCommand_base: {
  new (
    input: DeleteArtifactCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    DeleteArtifactCommandInput,
    DeleteArtifactCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [DeleteArtifactCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    DeleteArtifactCommandInput,
    DeleteArtifactCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class DeleteArtifactCommand extends DeleteArtifactCommand_base {
  protected static __types: {
    api: {
      input: DeleteArtifactRequest;
      output: DeleteArtifactResponse;
    };
    sdk: {
      input: DeleteArtifactCommandInput;
      output: DeleteArtifactCommandOutput;
    };
  };
}
