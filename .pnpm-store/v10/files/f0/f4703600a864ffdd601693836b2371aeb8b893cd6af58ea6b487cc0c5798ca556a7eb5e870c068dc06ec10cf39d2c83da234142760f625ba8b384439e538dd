import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  KendraClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../KendraClient";
import { ListIndicesRequest, ListIndicesResponse } from "../models/models_0";
export { __MetadataBearer };
export { $Command };
export interface ListIndicesCommandInput extends ListIndicesRequest {}
export interface ListIndicesCommandOutput
  extends ListIndicesResponse,
    __MetadataBearer {}
declare const ListIndicesCommand_base: {
  new (
    input: ListIndicesCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListIndicesCommandInput,
    ListIndicesCommandOutput,
    KendraClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListIndicesCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListIndicesCommandInput,
    ListIndicesCommandOutput,
    KendraClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListIndicesCommand extends ListIndicesCommand_base {
  protected static __types: {
    api: {
      input: ListIndicesRequest;
      output: ListIndicesResponse;
    };
    sdk: {
      input: ListIndicesCommandInput;
      output: ListIndicesCommandOutput;
    };
  };
}
