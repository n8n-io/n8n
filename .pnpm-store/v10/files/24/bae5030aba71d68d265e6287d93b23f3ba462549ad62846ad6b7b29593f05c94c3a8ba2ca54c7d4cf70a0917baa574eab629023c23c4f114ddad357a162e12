import { Command as $Command } from "@smithy/smithy-client";
import {
  MetadataBearer as __MetadataBearer,
  StreamingBlobPayloadInputTypes,
} from "@smithy/types";
import { WriteGetObjectResponseRequest } from "../models/models_1";
import {
  S3ClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../S3Client";
export { __MetadataBearer };
export { $Command };
export interface WriteGetObjectResponseCommandInput
  extends Pick<
    WriteGetObjectResponseRequest,
    Exclude<keyof WriteGetObjectResponseRequest, "Body">
  > {
  Body?: StreamingBlobPayloadInputTypes;
}
export interface WriteGetObjectResponseCommandOutput extends __MetadataBearer {}
declare const WriteGetObjectResponseCommand_base: {
  new (
    input: WriteGetObjectResponseCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    WriteGetObjectResponseCommandInput,
    WriteGetObjectResponseCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: WriteGetObjectResponseCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    WriteGetObjectResponseCommandInput,
    WriteGetObjectResponseCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class WriteGetObjectResponseCommand extends WriteGetObjectResponseCommand_base {
  protected static __types: {
    api: {
      input: WriteGetObjectResponseRequest;
      output: {};
    };
    sdk: {
      input: WriteGetObjectResponseCommandInput;
      output: WriteGetObjectResponseCommandOutput;
    };
  };
}
