import { Command as $Command } from "@smithy/smithy-client";
import {
  MetadataBearer as __MetadataBearer,
  StreamingBlobPayloadOutputTypes,
} from "@smithy/types";
import { GetObjectOutput, GetObjectRequest } from "../models/models_0";
import {
  S3ClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../S3Client";
export { __MetadataBearer };
export { $Command };
export interface GetObjectCommandInput extends GetObjectRequest {}
export interface GetObjectCommandOutput
  extends Pick<GetObjectOutput, Exclude<keyof GetObjectOutput, "Body">>,
    __MetadataBearer {
  Body?: StreamingBlobPayloadOutputTypes;
}
declare const GetObjectCommand_base: {
  new (
    input: GetObjectCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    GetObjectCommandInput,
    GetObjectCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: GetObjectCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    GetObjectCommandInput,
    GetObjectCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class GetObjectCommand extends GetObjectCommand_base {
  protected static __types: {
    api: {
      input: GetObjectRequest;
      output: GetObjectOutput;
    };
    sdk: {
      input: GetObjectCommandInput;
      output: GetObjectCommandOutput;
    };
  };
}
