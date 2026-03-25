import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListSpacesRequest, ListSpacesResponse } from "../models/models_4";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListSpacesCommandInput extends ListSpacesRequest {}
export interface ListSpacesCommandOutput
  extends ListSpacesResponse,
    __MetadataBearer {}
declare const ListSpacesCommand_base: {
  new (
    input: ListSpacesCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListSpacesCommandInput,
    ListSpacesCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListSpacesCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListSpacesCommandInput,
    ListSpacesCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListSpacesCommand extends ListSpacesCommand_base {
  protected static __types: {
    api: {
      input: ListSpacesRequest;
      output: ListSpacesResponse;
    };
    sdk: {
      input: ListSpacesCommandInput;
      output: ListSpacesCommandOutput;
    };
  };
}
