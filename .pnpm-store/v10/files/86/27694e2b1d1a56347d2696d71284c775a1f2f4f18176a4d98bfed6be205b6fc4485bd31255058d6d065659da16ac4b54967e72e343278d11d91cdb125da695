import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListModelPackagesInput,
  ListModelPackagesOutput,
} from "../models/models_4";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListModelPackagesCommandInput extends ListModelPackagesInput {}
export interface ListModelPackagesCommandOutput
  extends ListModelPackagesOutput,
    __MetadataBearer {}
declare const ListModelPackagesCommand_base: {
  new (
    input: ListModelPackagesCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListModelPackagesCommandInput,
    ListModelPackagesCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListModelPackagesCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListModelPackagesCommandInput,
    ListModelPackagesCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListModelPackagesCommand extends ListModelPackagesCommand_base {
  protected static __types: {
    api: {
      input: ListModelPackagesInput;
      output: ListModelPackagesOutput;
    };
    sdk: {
      input: ListModelPackagesCommandInput;
      output: ListModelPackagesCommandOutput;
    };
  };
}
