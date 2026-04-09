import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListDomainsRequest, ListDomainsResponse } from "../models/models_3";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListDomainsCommandInput extends ListDomainsRequest {}
export interface ListDomainsCommandOutput
  extends ListDomainsResponse,
    __MetadataBearer {}
declare const ListDomainsCommand_base: {
  new (
    input: ListDomainsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListDomainsCommandInput,
    ListDomainsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListDomainsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListDomainsCommandInput,
    ListDomainsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListDomainsCommand extends ListDomainsCommand_base {
  protected static __types: {
    api: {
      input: ListDomainsRequest;
      output: ListDomainsResponse;
    };
    sdk: {
      input: ListDomainsCommandInput;
      output: ListDomainsCommandOutput;
    };
  };
}
