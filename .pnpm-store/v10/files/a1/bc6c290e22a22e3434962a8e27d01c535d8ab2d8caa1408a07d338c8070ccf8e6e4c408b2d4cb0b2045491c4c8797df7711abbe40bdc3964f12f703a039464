import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import {
  ListSubscribedWorkteamsRequest,
  ListSubscribedWorkteamsResponse,
} from "../models/models_4";
import {
  SageMakerClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../SageMakerClient";
export { __MetadataBearer };
export { $Command };
export interface ListSubscribedWorkteamsCommandInput
  extends ListSubscribedWorkteamsRequest {}
export interface ListSubscribedWorkteamsCommandOutput
  extends ListSubscribedWorkteamsResponse,
    __MetadataBearer {}
declare const ListSubscribedWorkteamsCommand_base: {
  new (
    input: ListSubscribedWorkteamsCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    ListSubscribedWorkteamsCommandInput,
    ListSubscribedWorkteamsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    ...[input]: [] | [ListSubscribedWorkteamsCommandInput]
  ): import("@smithy/smithy-client").CommandImpl<
    ListSubscribedWorkteamsCommandInput,
    ListSubscribedWorkteamsCommandOutput,
    SageMakerClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class ListSubscribedWorkteamsCommand extends ListSubscribedWorkteamsCommand_base {
  protected static __types: {
    api: {
      input: ListSubscribedWorkteamsRequest;
      output: ListSubscribedWorkteamsResponse;
    };
    sdk: {
      input: ListSubscribedWorkteamsCommandInput;
      output: ListSubscribedWorkteamsCommandOutput;
    };
  };
}
