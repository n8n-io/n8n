import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteObjectsOutput, DeleteObjectsRequest } from "../models/models_0";
import {
  S3ClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../S3Client";
export { __MetadataBearer };
export { $Command };
export interface DeleteObjectsCommandInput extends DeleteObjectsRequest {}
export interface DeleteObjectsCommandOutput
  extends DeleteObjectsOutput,
    __MetadataBearer {}
declare const DeleteObjectsCommand_base: {
  new (
    input: DeleteObjectsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    DeleteObjectsCommandInput,
    DeleteObjectsCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: DeleteObjectsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    DeleteObjectsCommandInput,
    DeleteObjectsCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class DeleteObjectsCommand extends DeleteObjectsCommand_base {
  protected static __types: {
    api: {
      input: DeleteObjectsRequest;
      output: DeleteObjectsOutput;
    };
    sdk: {
      input: DeleteObjectsCommandInput;
      output: DeleteObjectsCommandOutput;
    };
  };
}
