import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  KendraClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../KendraClient";
import {
  DescribeIndexRequest,
  DescribeIndexResponse,
} from "../models/models_0";
export { __MetadataBearer };
export { $Command };
export interface DescribeIndexCommandInput extends DescribeIndexRequest {}
export interface DescribeIndexCommandOutput
  extends DescribeIndexResponse,
    __MetadataBearer {}
declare const DescribeIndexCommand_base: {
  new (
    input: DescribeIndexCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    DescribeIndexCommandInput,
    DescribeIndexCommandOutput,
    KendraClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: DescribeIndexCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    DescribeIndexCommandInput,
    DescribeIndexCommandOutput,
    KendraClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class DescribeIndexCommand extends DescribeIndexCommand_base {
  protected static __types: {
    api: {
      input: DescribeIndexRequest;
      output: DescribeIndexResponse;
    };
    sdk: {
      input: DescribeIndexCommandInput;
      output: DescribeIndexCommandOutput;
    };
  };
}
