import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  CognitoIdentityClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../CognitoIdentityClient";
import { DescribeIdentityInput, IdentityDescription } from "../models/models_0";
export { __MetadataBearer };
export { $Command };
export interface DescribeIdentityCommandInput extends DescribeIdentityInput {}
export interface DescribeIdentityCommandOutput
  extends IdentityDescription,
    __MetadataBearer {}
declare const DescribeIdentityCommand_base: {
  new (
    input: DescribeIdentityCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    DescribeIdentityCommandInput,
    DescribeIdentityCommandOutput,
    CognitoIdentityClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: DescribeIdentityCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    DescribeIdentityCommandInput,
    DescribeIdentityCommandOutput,
    CognitoIdentityClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class DescribeIdentityCommand extends DescribeIdentityCommand_base {
  protected static __types: {
    api: {
      input: DescribeIdentityInput;
      output: IdentityDescription;
    };
    sdk: {
      input: DescribeIdentityCommandInput;
      output: DescribeIdentityCommandOutput;
    };
  };
}
