import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  KendraClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../KendraClient";
import {
  BatchDeleteDocumentRequest,
  BatchDeleteDocumentResponse,
} from "../models/models_0";
export { __MetadataBearer };
export { $Command };
export interface BatchDeleteDocumentCommandInput
  extends BatchDeleteDocumentRequest {}
export interface BatchDeleteDocumentCommandOutput
  extends BatchDeleteDocumentResponse,
    __MetadataBearer {}
declare const BatchDeleteDocumentCommand_base: {
  new (
    input: BatchDeleteDocumentCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    BatchDeleteDocumentCommandInput,
    BatchDeleteDocumentCommandOutput,
    KendraClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: BatchDeleteDocumentCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    BatchDeleteDocumentCommandInput,
    BatchDeleteDocumentCommandOutput,
    KendraClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class BatchDeleteDocumentCommand extends BatchDeleteDocumentCommand_base {
  protected static __types: {
    api: {
      input: BatchDeleteDocumentRequest;
      output: BatchDeleteDocumentResponse;
    };
    sdk: {
      input: BatchDeleteDocumentCommandInput;
      output: BatchDeleteDocumentCommandOutput;
    };
  };
}
