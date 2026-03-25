import { Command as $Command } from "@smithy/smithy-client";
import {
  MetadataBearer as __MetadataBearer,
  StreamingBlobPayloadOutputTypes,
} from "@smithy/types";
import {
  GetObjectTorrentOutput,
  GetObjectTorrentRequest,
} from "../models/models_0";
import {
  S3ClientResolvedConfig,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "../S3Client";
export { __MetadataBearer };
export { $Command };
export interface GetObjectTorrentCommandInput extends GetObjectTorrentRequest {}
export interface GetObjectTorrentCommandOutput
  extends Pick<
      GetObjectTorrentOutput,
      Exclude<keyof GetObjectTorrentOutput, "Body">
    >,
    __MetadataBearer {
  Body?: StreamingBlobPayloadOutputTypes;
}
declare const GetObjectTorrentCommand_base: {
  new (
    input: GetObjectTorrentCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    GetObjectTorrentCommandInput,
    GetObjectTorrentCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  new (
    input: GetObjectTorrentCommandInput
  ): import("@smithy/smithy-client").CommandImpl<
    GetObjectTorrentCommandInput,
    GetObjectTorrentCommandOutput,
    S3ClientResolvedConfig,
    ServiceInputTypes,
    ServiceOutputTypes
  >;
  getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
export declare class GetObjectTorrentCommand extends GetObjectTorrentCommand_base {
  protected static __types: {
    api: {
      input: GetObjectTorrentRequest;
      output: GetObjectTorrentOutput;
    };
    sdk: {
      input: GetObjectTorrentCommandInput;
      output: GetObjectTorrentCommandOutput;
    };
  };
}
