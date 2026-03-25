import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListImagesRequest, ListImagesResponse } from "../models/models_4";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListImagesCommandInput extends ListImagesRequest {}
export interface ListImagesCommandOutput
  extends ListImagesResponse,
    __MetadataBearer {}
declare const ListImagesCommand_base: {
  new (
    input: ListImagesCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListImagesCommandInput,
    ListImagesCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListImagesCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListImagesCommandInput,
    ListImagesCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListImagesCommand extends ListImagesCommand_base {
  protected static __types: {
    api: {
      input: ListImagesRequest;
      output: ListImagesResponse;
    };
    sdk: {
      input: ListImagesCommandInput;
      output: ListImagesCommandOutput;
    };
  };
}
