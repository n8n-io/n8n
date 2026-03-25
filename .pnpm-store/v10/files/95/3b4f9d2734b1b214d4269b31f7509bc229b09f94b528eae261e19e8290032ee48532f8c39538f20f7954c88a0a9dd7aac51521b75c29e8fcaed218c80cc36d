import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  KendraClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../KendraClient";
import {
  BatchPutDocumentRequest,
  BatchPutDocumentResponse,
} from "../models/models_0";
export { __MetadataBearer };
export { $Command };
export interface BatchPutDocumentCommandInput extends BatchPutDocumentRequest {}
export interface BatchPutDocumentCommandOutput
  extends BatchPutDocumentResponse,
    __MetadataBearer {}
declare const BatchPutDocumentCommand_base: {
  new (
    input: BatchPutDocumentCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    BatchPutDocumentCommandInput,
    BatchPutDocumentCommandOutput,
    KendraClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: BatchPutDocumentCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    BatchPutDocumentCommandInput,
    BatchPutDocumentCommandOutput,
    KendraClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class BatchPutDocumentCommand extends BatchPutDocumentCommand_base {
  protected static __types: {
    api: {
      input: BatchPutDocumentRequest;
      output: BatchPutDocumentResponse;
    };
    sdk: {
      input: BatchPutDocumentCommandInput;
      output: BatchPutDocumentCommandOutput;
    };
  };
}
